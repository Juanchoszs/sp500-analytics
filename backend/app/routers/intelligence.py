from datetime import date, datetime
from typing import Any
import io
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
import logging

from app.config import settings
from app.domain.application.services import MarketAnalyzerService
from app.analytics.market_analyzer import MarketAnalyzer
from app.analytics.query_engine import QueryEngine
from app.analytics.query_cache import query_cache
from app.providers import get_provider_dependency
from app.providers.base import DataProvider
from app.schemas import (
    QuestionsListResponse, QueryResponse,
    HedgingStrengthResponse, YieldAnomalyResponse,
)
from app.analytics.index_converter import calculate_index_ratio, convert_exposure_dict
from app.analytics.docx_generator import generate_docx_report, ReportConfig
from app.routers.helpers import enrich_with_index_data
from app.analytics.hedging_strength import HedgingStrengthAnalyzer
from app.analytics.yield_anomaly import YieldAnomalyAnalyzer

logger = logging.getLogger("app.routers.intelligence")
router = APIRouter()

CONTRACT_MULTIPLIER = 100


def _strike_to_out(s, spot: float):
    from app.schemas import StrikeExposureOut
    return StrikeExposureOut(
        strike=s.strike,
        call_oi=s.call_oi,
        put_oi=s.put_oi,
        call_volume=s.call_volume,
        put_volume=s.put_volume,
        gamma_exposure=s.gamma_exposure,
        delta_exposure=s.delta_exposure,
        vega_exposure=s.vega_exposure,
        call_delta_exposure=-(s.call_delta * s.call_oi * CONTRACT_MULTIPLIER * spot),
        put_delta_exposure=-(s.put_delta * s.put_oi * CONTRACT_MULTIPLIER * spot),
        call_gamma_exposure=s.call_gamma * s.call_oi * CONTRACT_MULTIPLIER * spot * spot * 0.01,
        put_gamma_exposure=-s.put_gamma * s.put_oi * CONTRACT_MULTIPLIER * spot * spot * 0.01,
    )


def _build_exposure_payload(report) -> dict:
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
        "strikes": [_strike_to_out(s, report.spot_price).model_dump() for s in report.strikes],
    }


def _convert_exposure_to_index(exposure: dict[str, Any], ratio: float) -> dict[str, Any]:
    index_price = exposure.get("index_price", 0.0)
    return convert_exposure_dict(exposure, ratio, index_price)


def _get_options_chain_with_spy_fallback(ticker: str, exp: date, provider: DataProvider):
    try:
        return provider.get_options_chain(ticker, exp)
    except Exception as exc:
        if isinstance(ticker, str) and ticker.upper() in ("^GSPC", "GSPC"):
            logger.warning("Options chain for %s failed, falling back to SPY: %s", ticker, exc)
            try:
                return provider.get_options_chain("SPY", exp)
            except Exception:
                spy_exp = _resolve_expiration(ticker="SPY", expiration=exp.strftime("%Y-%m-%d"), provider=provider)
                return provider.get_options_chain("SPY", spy_exp)
        raise


def _resolve_expiration(ticker: str, expiration: str | None, provider: DataProvider) -> date:
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


@router.get("/intelligence", response_model=None)
def get_intelligence(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    provider: DataProvider = Depends(get_provider_dependency),
):
    exp = _resolve_expiration(ticker, expiration, provider)
    report = MarketAnalyzer.generate_intelligence_report(ticker, exp)
    
    report_dict = report.model_dump() if hasattr(report, 'model_dump') else report

    if ticker == "SPY":
        try:
            spy_price = report_dict.get("spot_price", 0)
            report_dict = enrich_with_index_data(report_dict, ticker, spy_price, provider)

            if "index_ratio" in report_dict:
                gamma = report_dict.get("gamma_analysis") or {}
                if isinstance(gamma, dict):
                    for level_key in ("call_wall", "put_wall", "zero_gamma"):
                        val = gamma.get(level_key)
                        if val is not None:
                            report_dict[f"{level_key}_index"] = round(val * report_dict["index_ratio"], 2)
        except Exception as e:
            logger.exception("Failed to fetch index_price for intelligence of %s: %s", ticker, e)

    return report_dict


@router.get("/questions", response_model=QuestionsListResponse)
def get_questions():
    return QuestionsListResponse(questions=QueryEngine.list_supported_questions())


@router.get("/query", response_model=QueryResponse)
def get_query(
    question_key: str = Query(...),
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    provider: DataProvider = Depends(get_provider_dependency),
):
    exp = _resolve_expiration(ticker, expiration, provider)
    exp_str = exp.strftime("%Y-%m-%d")
    
    # Check cache first
    cached_response = query_cache.get(question_key, ticker, exp_str)
    if cached_response:
        logger.info("Cache hit for query: %s, ticker: %s, expiration: %s", question_key, ticker, exp_str)
        return QueryResponse(**cached_response)
    
    # Generate response
    logger.info("Cache miss for query: %s, ticker: %s, expiration: %s", question_key, ticker, exp_str)
    report = MarketAnalyzer.generate_intelligence_report(ticker, exp)
    answer_dict = QueryEngine.answer_question(question_key, report["query_context"])
    
    response = QueryResponse(
        question_key=answer_dict["question_key"],
        answer=answer_dict["answer"],
        justification_data=answer_dict["justification_data"],
        confidence=answer_dict["confidence"]
    )
    
    # Cache the response
    answer_dict["ticker"] = ticker
    query_cache.set(question_key, ticker, exp_str, answer_dict)
    
    return response


@router.get("/download-report")
def download_report(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    include_executive_summary: bool = Query(default=True),
    include_asset_data: bool = Query(default=True),
    include_market_interpretation: bool = Query(default=True),
    include_gamma_exposure: bool = Query(default=True),
    include_delta_exposure: bool = Query(default=True),
    include_open_interest: bool = Query(default=True),
    include_volume: bool = Query(default=True),
    include_structural_levels: bool = Query(default=True),
    include_detailed_analysis: bool = Query(default=True),
    include_scenarios: bool = Query(default=True),
    include_conclusions: bool = Query(default=True),
    include_charts: bool = Query(default=True),
    chart_types: str = Query(default="gex,dex,oi,volume"),
    provider: DataProvider = Depends(get_provider_dependency),
):
    exp = _resolve_expiration(ticker, expiration, provider)

    # Parse chart_types from comma-separated string
    chart_types_list = [ct.strip() for ct in chart_types.split(",") if ct.strip()]

    # Create report configuration
    config = ReportConfig(
        include_executive_summary=include_executive_summary,
        include_asset_data=include_asset_data,
        include_market_interpretation=include_market_interpretation,
        include_gamma_exposure=include_gamma_exposure,
        include_delta_exposure=include_delta_exposure,
        include_open_interest=include_open_interest,
        include_volume=include_volume,
        include_structural_levels=include_structural_levels,
        include_detailed_analysis=include_detailed_analysis,
        include_scenarios=include_scenarios,
        include_conclusions=include_conclusions,
        include_charts=include_charts,
        chart_types=chart_types_list,
    )

    report = MarketAnalyzer.generate_intelligence_report(ticker, exp)

    analytics_chain = provider.get_options_chain(ticker, exp)
    analytics_exposure_report = MarketAnalyzerService.build_exposure_report(analytics_chain, date.today())
    analytics_exposure_payload = _build_exposure_payload(analytics_exposure_report)

    chart_ratio = None
    if isinstance(ticker, str) and ticker.upper() in ("SPY", "GSPC", "^GSPC"):
        try:
            gspc_price = provider.get_index_price("^GSPC")
            if analytics_exposure_report.spot_price and gspc_price:
                chart_ratio = gspc_price / analytics_exposure_report.spot_price
        except Exception:
            chart_ratio = None

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
            index_exp = _resolve_expiration(index_ticker, expiration, provider)
            chain_for_charts = provider.get_options_chain(index_ticker, index_exp)
        except Exception:
            chart_chain_source = ticker
            chart_source = "^GSPC" if ticker == "SPY" and chart_ratio is not None else ticker
            chain_for_charts = provider.get_options_chain(ticker, exp)
    except Exception:
        chart_source = ticker
        chain_for_charts = provider.get_options_chain(ticker, exp)

    exposure_for_charts = MarketAnalyzerService.build_exposure_report(chain_for_charts, date.today())
    chart_payload = _build_exposure_payload(exposure_for_charts)

    if not isinstance(report, dict) and hasattr(report, "model_dump"):
        report_obj = report.model_dump()
    else:
        report_obj = report

    display_exposure_payload = analytics_exposure_payload
    if chart_source == "^GSPC" and chart_ratio is not None:
        display_exposure_payload = _convert_exposure_to_index(analytics_exposure_payload, chart_ratio)
        chart_payload = _convert_exposure_to_index(chart_payload, chart_ratio)

    docx_buffer = generate_docx_report(
        report_obj,
        display_exposure_payload,
        chart_payload,
        chart_source=chart_source,
        chart_ratio=chart_ratio,
        config=config,
    )

    buf_bytes = docx_buffer.getvalue() if hasattr(docx_buffer, "getvalue") else bytes(docx_buffer)

    sanitized_ticker = ticker.lstrip("^") if isinstance(ticker, str) else str(ticker)
    filename = f"{sanitized_ticker}_Intelligence_{exp}.docx"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    }

    return StreamingResponse(io.BytesIO(buf_bytes),
                             media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                             headers=headers)


@router.get("/hedging-strength", response_model=HedgingStrengthResponse)
def get_hedging_strength(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    provider: DataProvider = Depends(get_provider_dependency),
):
    exp = _resolve_expiration(ticker, expiration, provider)
    chain = _get_options_chain_with_spy_fallback(ticker, exp, provider)
    report = MarketAnalyzerService.build_exposure_report(chain, date.today())
    T = max((exp - date.today()).days, 0.5) / 365.0
    result = HedgingStrengthAnalyzer.analyze(report, T)
    return HedgingStrengthResponse(
        score=result.score,
        classification=result.classification,
        net_dex=result.net_dex,
        net_gex=result.net_gex,
        factors=result.factors,
        description=result.description,
    )


@router.get("/yield-anomaly", response_model=YieldAnomalyResponse)
def get_yield_anomaly(ticker: str = Query(default="^GSPC")):
    result = YieldAnomalyAnalyzer.analyze(ticker)
    return YieldAnomalyResponse(
        score=result.score,
        expected_direction=result.expected_direction,
        confidence=result.confidence,
        current_price=result.current_price,
        current_log_return=result.current_log_return,
        anomalies=result.anomalies,
        summary=result.summary,
        historical_context=result.historical_context,
        price_history=result.price_history,
        anomaly_markers=result.anomaly_markers,
        ohlc_data=result.ohlc_data,
        log_returns_data=result.log_returns_data,
        upper_threshold=result.upper_threshold,
        lower_threshold=result.lower_threshold,
    )


@router.get("/cache/stats")
def get_cache_stats():
    """Get cache statistics for monitoring."""
    return query_cache.get_stats()


@router.post("/cache/invalidate")
def invalidate_cache(ticker: str = Query(...)):
    """Invalidate cache for a specific ticker."""
    query_cache.invalidate_ticker(ticker)
    return {"status": "success", "message": f"Cache invalidated for ticker: {ticker}"}


@router.post("/cache/clear")
def clear_cache():
    """Clear all cache entries."""
    query_cache.clear()
    return {"status": "success", "message": "All cache entries cleared"}
