from datetime import date, datetime
from typing import Any
import io
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
import logging

from app.config import settings
from app.application.use_cases import (
    GetIntelligenceUseCase,
    DownloadReportUseCase,
)
from app.analytics.docx_generator import ReportConfig
from app.providers import get_provider_dependency
from app.providers.base import DataProvider
from app.schemas import (
    QuestionsListResponse, QueryResponse,
    HedgingStrengthResponse, YieldAnomalyResponse,
)
from app.analytics.query_cache import query_cache
from app.analytics.hedging_strength import HedgingStrengthAnalyzer
from app.analytics.yield_anomaly import YieldAnomalyAnalyzer
from app.domain.application.services import MarketAnalyzerService
from app.domain.service.ticker_service import TickerService
from app.interfaces.validators import QueryValidator, TickerValidator

logger = logging.getLogger("app.routers.intelligence")
intelligence_router = APIRouter()

# Initialize use cases
get_intelligence_use_case = GetIntelligenceUseCase()
download_report_use_case = DownloadReportUseCase()


def _resolve_expiration(ticker: str, expiration: str | None, provider: DataProvider) -> date:
    """Resolve expiration date using validator."""
    return QueryValidator.ExpirationValidator.validate(expiration, provider, ticker)


@intelligence_router.get("/intelligence", response_model=None)
def get_intelligence(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    provider: DataProvider = Depends(get_provider_dependency),
):
    """Get comprehensive market intelligence report."""
    # Validate and normalize ticker
    normalized_ticker = TickerValidator.normalize_for_options(ticker)
    
    # Resolve expiration
    exp = _resolve_expiration(normalized_ticker, expiration, provider)
    
    # Use the use case
    report = get_intelligence_use_case.execute(
        ticker=ticker,
        expiration=exp,
        provider=provider,
        enrich_with_index=True
    )
    
    return report


@intelligence_router.get("/questions", response_model=QuestionsListResponse)
def get_questions():
    """Get list of supported questions."""
    return QuestionsListResponse(questions=get_intelligence_use_case.list_supported_questions())


@intelligence_router.get("/query", response_model=QueryResponse)
def get_query(
    question_key: str = Query(...),
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    provider: DataProvider = Depends(get_provider_dependency),
):
    """Answer a specific question about market conditions."""
    # Validate and normalize ticker
    normalized_ticker = TickerValidator.normalize_for_options(ticker)
    
    # Resolve expiration
    exp = _resolve_expiration(normalized_ticker, expiration, provider)
    
    # Use the use case
    answer_dict = get_intelligence_use_case.answer_question(
        question_key=question_key,
        ticker=ticker,
        expiration=exp,
        provider=provider
    )
    
    return QueryResponse(**answer_dict)


@intelligence_router.get("/download-report")
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
    """Download market intelligence report as DOCX."""
    # Validate and normalize ticker
    normalized_ticker = TickerValidator.normalize_for_options(ticker)
    
    # Resolve expiration
    exp = _resolve_expiration(normalized_ticker, expiration, provider)

    # Parse chart types
    chart_types_list = QueryValidator.validate_chart_types(chart_types)

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

    # Use the use case
    buf_bytes, filename = download_report_use_case.execute(
        ticker=ticker,
        expiration=exp,
        provider=provider,
        config=config,
        chart_types=chart_types_list
    )

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    }

    return StreamingResponse(
        io.BytesIO(buf_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers=headers
    )


@intelligence_router.get("/hedging-strength", response_model=HedgingStrengthResponse)
def get_hedging_strength(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    provider: DataProvider = Depends(get_provider_dependency),
):
    """Get delta hedging strength analysis."""
    # Validate and normalize ticker
    normalized_ticker = TickerValidator.normalize_for_options(ticker)
    
    # Resolve expiration
    exp = _resolve_expiration(normalized_ticker, expiration, provider)
    
    # Get options chain with fallback
    try:
        chain = provider.get_options_chain(normalized_ticker, exp)
    except Exception as exc:
        if normalized_ticker.upper() in ("^GSPC", "GSPC"):
            logger.warning("Options chain for %s failed, falling back to SPY: %s", normalized_ticker, exc)
            try:
                chain = provider.get_options_chain("SPY", exp)
            except Exception:
                spy_exp = _resolve_expiration("SPY", exp.strftime("%Y-%m-%d"), provider)
                chain = provider.get_options_chain("SPY", spy_exp)
        else:
            raise
    
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


@intelligence_router.get("/yield-anomaly", response_model=YieldAnomalyResponse)
def get_yield_anomaly(ticker: str = Query(default="^GSPC")):
    """Get yield anomaly analysis."""
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


@intelligence_router.get("/cache/stats")
def get_cache_stats():
    """Get cache statistics for monitoring."""
    return query_cache.get_stats()


@intelligence_router.post("/cache/invalidate")
def invalidate_cache(ticker: str = Query(...)):
    """Invalidate cache for a specific ticker."""
    query_cache.invalidate_ticker(ticker)
    return {"status": "success", "message": f"Cache invalidated for ticker: {ticker}"}


@intelligence_router.post("/cache/clear")
def clear_cache():
    """Clear all cache entries."""
    query_cache.clear()
    return {"status": "success", "message": "All cache entries cleared"}
