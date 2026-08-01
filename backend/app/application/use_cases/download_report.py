from datetime import date, datetime
from typing import Any
import io
import logging

from app.domain.service.ticker_service import TickerService
from app.domain.application.services import MarketAnalyzerService
from app.analytics.market_analyzer import MarketAnalyzer
from app.analytics.index_converter import calculate_index_ratio, convert_exposure_dict
from app.analytics.docx_generator import generate_docx_report, ReportConfig
from app.providers.base import DataProvider

logger = logging.getLogger("app.use_cases.download_report")

CONTRACT_MULTIPLIER = 100


class DownloadReportUseCase:
    """Use case for generating and downloading market intelligence reports."""
    
    def __init__(self):
        pass
    
    def _strike_to_out(self, s, spot: float) -> dict:
        """Convert StrikeExposure to output format."""
        return {
            "strike": s.strike,
            "call_oi": s.call_oi,
            "put_oi": s.put_oi,
            "call_volume": s.call_volume,
            "put_volume": s.put_volume,
            "gamma_exposure": s.gamma_exposure,
            "delta_exposure": s.delta_exposure,
            "vega_exposure": s.vega_exposure,
            "call_delta_exposure": -(s.call_delta * s.call_oi * CONTRACT_MULTIPLIER * spot),
            "put_delta_exposure": -(s.put_delta * s.put_oi * CONTRACT_MULTIPLIER * spot),
            "call_gamma_exposure": s.call_gamma * s.call_oi * CONTRACT_MULTIPLIER * spot * spot * 0.01,
            "put_gamma_exposure": -s.put_gamma * s.put_oi * CONTRACT_MULTIPLIER * spot * spot * 0.01,
        }
    
    def _build_exposure_payload(self, report) -> dict:
        """Build exposure payload from report."""
        return {
            "spot_price": report.spot_price,
            "net_gamma_exposure": report.net_gamma_exposure,
            "net_delta_exposure": report.net_delta_exposure,
            "net_vega_exposure": report.net_vega_exposure,
            "call_wall": report.call_wall,
            "put_wall": report.put_wall,
            "zero_gamma": report.zero_gamma,
            "max_pain": report.max_pain,
            "put_call_oi_ratio": report.put_call_oi_ratio,
            "put_call_volume_ratio": report.put_call_volume_ratio,
            "strikes": [self._strike_to_out(s, report.spot_price) for s in report.strikes],
        }
    
    def _resolve_expiration(
        self,
        ticker: str,
        expiration: str | None,
        provider: DataProvider
    ) -> date:
        """Resolve expiration date from string or get default."""
        from fastapi import HTTPException
        
        expirations = provider.get_expirations(ticker)
        if not expirations:
            raise HTTPException(404, f"No hay vencimientos disponibles para {ticker}")
        if expiration is None:
            return expirations[0]
        try:
            target = datetime.strptime(expiration, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "El parámetro 'expiration' debe tener formato YYYY-MM-DD")
        if target not in expirations:
            raise HTTPException(404, f"'{expiration}' no es un vencimiento válido para {ticker}")
        return target
    
    def _convert_exposure_to_index(self, exposure: dict[str, Any], ratio: float) -> dict[str, Any]:
        """Convert exposure data to index scale."""
        index_price = exposure.get("index_price", 0.0)
        return convert_exposure_dict(exposure, ratio, index_price)
    
    def execute(
        self,
        ticker: str,
        expiration: date,
        provider: DataProvider,
        config: ReportConfig,
        chart_types: list[str] = None
    ) -> tuple[bytes, str]:
        """
        Generate and download market intelligence report.
        
        Args:
            ticker: Ticker symbol
            expiration: Expiration date
            provider: Data provider instance
            config: Report configuration
            chart_types: List of chart types to include
            
        Returns:
            Tuple of (report bytes, filename)
        """
        if chart_types is None:
            chart_types = ["gex", "dex", "oi", "volume"]
        
        # Normalize ticker for options data
        options_ticker = TickerService.normalize_for_options_data(ticker)
        
        # Generate intelligence report
        report = MarketAnalyzer.generate_intelligence_report(options_ticker, expiration)

        # Get analytics chain and exposure report
        analytics_chain = provider.get_options_chain(options_ticker, expiration)
        analytics_exposure_report = MarketAnalyzerService.build_exposure_report(analytics_chain, date.today())
        analytics_exposure_payload = self._build_exposure_payload(analytics_exposure_report)

        # Calculate chart ratio for index conversion
        chart_ratio = None
        if isinstance(ticker, str) and ticker.upper() in ("SPY", "GSPC", "^GSPC"):
            try:
                gspc_price = provider.get_index_price("^GSPC")
                if analytics_exposure_report.spot_price and gspc_price:
                    chart_ratio = gspc_price / analytics_exposure_report.spot_price
            except Exception:
                chart_ratio = None

        # Determine chart source
        chart_source = ticker
        chart_chain_source = ticker
        try:
            if isinstance(ticker, str) and ticker.upper() == "SPY" and chart_ratio is not None:
                chart_source = "^GSPC"
                chart_chain_source = "^GSPC"
            else:
                chart_source = ticker
                chart_chain_source = ticker
            try:
                index_ticker = chart_chain_source
                index_exp = self._resolve_expiration(index_ticker, expiration.strftime("%Y-%m-%d"), provider)
                chain_for_charts = provider.get_options_chain(index_ticker, index_exp)
            except Exception:
                chart_chain_source = ticker
                chart_source = "^GSPC" if ticker == "SPY" and chart_ratio is not None else ticker
                chain_for_charts = provider.get_options_chain(ticker, expiration)
        except Exception:
            chart_source = ticker
            chain_for_charts = provider.get_options_chain(ticker, expiration)

        # Build chart payload
        exposure_for_charts = MarketAnalyzerService.build_exposure_report(chain_for_charts, date.today())
        chart_payload = self._build_exposure_payload(exposure_for_charts)

        # Convert report to dict if needed
        if not isinstance(report, dict) and hasattr(report, "model_dump"):
            report_obj = report.model_dump()
        else:
            report_obj = report

        # Apply index conversion if needed
        display_exposure_payload = analytics_exposure_payload
        if chart_source == "^GSPC" and chart_ratio is not None:
            display_exposure_payload = self._convert_exposure_to_index(analytics_exposure_payload, chart_ratio)
            chart_payload = self._convert_exposure_to_index(chart_payload, chart_ratio)

        # Generate DOCX report
        docx_buffer = generate_docx_report(
            report_obj,
            display_exposure_payload,
            chart_payload,
            chart_source=chart_source,
            chart_ratio=chart_ratio,
            config=config,
        )

        buf_bytes = docx_buffer.getvalue() if hasattr(docx_buffer, "getvalue") else bytes(docx_buffer)

        # Generate filename
        sanitized_ticker = ticker.lstrip("^") if isinstance(ticker, str) else str(ticker)
        filename = f"{sanitized_ticker}_Intelligence_{expiration}.docx"

        return buf_bytes, filename
