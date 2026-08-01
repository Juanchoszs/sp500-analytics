from datetime import date, datetime
from typing import Any, Optional
import logging

from app.domain.service.ticker_service import TickerService
from app.domain.application.services import MarketAnalyzerService
from app.analytics.index_converter import calculate_index_ratio, convert_exposure_dict
from app.providers.base import DataProvider

logger = logging.getLogger("app.use_cases.get_exposure")

CONTRACT_MULTIPLIER = 100


class GetExposureUseCase:
    """Use case for retrieving market exposure data (GEX, DEX, etc.)."""
    
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
    
    def _get_options_chain_with_fallback(
        self,
        ticker: str,
        exp: date,
        provider: DataProvider
    ):
        """Get options chain with SPY fallback for index tickers."""
        try:
            return provider.get_options_chain(ticker, exp)
        except Exception as exc:
            if isinstance(ticker, str) and ticker.upper() in ("^GSPC", "GSPC"):
                logger.warning("Options chain for %s failed, falling back to SPY: %s", ticker, exc)
                try:
                    return provider.get_options_chain("SPY", exp)
                except Exception:
                    spy_exp = self._resolve_expiration(ticker="SPY", expiration=exp.strftime("%Y-%m-%d"), provider=provider)
                    return provider.get_options_chain("SPY", spy_exp)
            raise
    
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
    
    def execute(
        self,
        ticker: str,
        expiration: date,
        provider: DataProvider,
        convert_to_index_scale: bool = True
    ) -> dict[str, Any]:
        """
        Get exposure data for a ticker and expiration.
        
        Args:
            ticker: Ticker symbol
            expiration: Expiration date
            provider: Data provider instance
            convert_to_index_scale: Whether to convert SPY to index scale
            
        Returns:
            Dictionary containing exposure data
        """
        # Normalize ticker for options data
        options_ticker = TickerService.normalize_for_options_data(ticker)
        
        # Get options chain with fallback
        chain = self._get_options_chain_with_fallback(options_ticker, expiration, provider)
        
        # Build exposure report
        report = MarketAnalyzerService.build_exposure_report(chain, date.today())
        
        # Build response
        resp = {
            "ticker": ticker,
            "expiration": expiration,
            "spot_price": report.spot_price,
            "net_gamma_exposure": report.net_gamma_exposure,
            "net_delta_exposure": report.net_delta_exposure,
            "net_vega_exposure": report.net_vega_exposure,
            "call_wall": report.call_wall,
            "put_wall": report.put_wall,
            "gamma_wall": report.gamma_wall,
            "zero_gamma": report.zero_gamma,
            "max_pain": report.max_pain,
            "put_call_oi_ratio": report.put_call_oi_ratio,
            "put_call_volume_ratio": report.put_call_volume_ratio,
            "high_liquidity_strikes": report.high_liquidity_strikes,
            "pinning_probability": report.pinning_probability,
            "strikes": [self._strike_to_out(s, report.spot_price) for s in report.strikes],
        }
        
        # Convert SPY to GSPC scale for display if requested
        if convert_to_index_scale and ticker.upper() == "SPY":
            try:
                index_price = provider.get_index_price("^GSPC")
                if index_price and report.spot_price > 0:
                    ratio = calculate_index_ratio(report.spot_price, index_price)
                    if 5.0 < ratio < 15.0:  # Validate reasonable SPY -> GSPC ratio (usually ~10)
                        resp = convert_exposure_dict(resp, ratio, index_price)
                        logger.info(f"Successfully converted SPY to GSPC scale using ratio: {ratio:.4f}")
                    else:
                        logger.warning(f"Calculated index ratio {ratio:.4f} seems incorrect for SPY->GSPC, skipping conversion.")
            except Exception as e:
                logger.exception("Failed to fetch index_price for exposure of %s: %s", ticker, e)
        
        return resp
    
    def get_max_pain(
        self,
        ticker: str,
        expiration: date,
        provider: DataProvider
    ) -> dict[str, Any]:
        """
        Get max pain data for a ticker and expiration.
        
        Args:
            ticker: Ticker symbol
            expiration: Expiration date
            provider: Data provider instance
            
        Returns:
            Dictionary containing max pain data
        """
        # Normalize ticker for options data
        options_ticker = TickerService.normalize_for_options_data(ticker)
        
        # Get options chain
        chain = provider.get_options_chain(options_ticker, expiration)
        report = MarketAnalyzerService.build_exposure_report(chain, date.today())

        distance_pct = None
        if report.max_pain:
            distance_pct = ((report.spot_price - report.max_pain) / report.spot_price) * 100

        resp = {
            "ticker": ticker,
            "expiration": expiration,
            "max_pain": report.max_pain,
            "spot_price": report.spot_price,
            "distance_pct": distance_pct,
        }

        # Enrich with index data
        from app.routers.helpers import enrich_with_index_data
        resp = enrich_with_index_data(resp, ticker, report.spot_price, provider)

        # Add max_pain_index if we have index data and max_pain
        if ticker.upper() == "SPY" and "index_ratio" in resp and report.max_pain is not None:
            resp["max_pain_index"] = round(report.max_pain * resp["index_ratio"], 2)

        return resp
