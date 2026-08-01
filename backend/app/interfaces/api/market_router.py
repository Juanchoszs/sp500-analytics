from datetime import date, datetime
from typing import Any
from fastapi import APIRouter, HTTPException, Query, Depends
import logging

from app.config import settings
from app.application.use_cases import GetExposureUseCase
from app.greeks.black_scholes import compute_greeks
from app.providers import get_provider_dependency
from app.providers.base import DataProvider
from app.schemas import (
    ExposureResponse, GreeksAtStrike, GreeksResponse,
    HeatmapCell, HeatmapResponse, MaxPainResponse, OptionQuoteOut,
    OptionsChainResponse, StrikeExposureOut,
)
from app.analytics.index_converter import calculate_index_ratio, convert_exposure_dict, convert_strike
from app.routers.helpers import enrich_with_index_data
from app.domain.service.ticker_service import TickerService
from app.interfaces.validators import QueryValidator, TickerValidator
from app.shared.constants import CONTRACT_MULTIPLIER

logger = logging.getLogger("app.routers.market")
market_router = APIRouter()

# Initialize use case
get_exposure_use_case = GetExposureUseCase()


def _resolve_expiration(ticker: str, expiration: str | None, provider: DataProvider) -> date:
    """Resolve expiration date using validator."""
    return QueryValidator.ExpirationValidator.validate(expiration, provider, ticker)


@market_router.get("/options", response_model=OptionsChainResponse)
def get_options(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None, description="YYYY-MM-DD; por defecto, el vencimiento más próximo"),
    provider: DataProvider = Depends(get_provider_dependency),
):
    """Get options chain for a ticker and expiration."""
    # Validate and normalize ticker
    normalized_ticker = TickerValidator.normalize_for_options(ticker)
    
    # Resolve expiration
    exp = _resolve_expiration(normalized_ticker, expiration, provider)
    
    # Get options chain
    chain = provider.get_options_chain(normalized_ticker, exp)

    def to_out(q):
        return OptionQuoteOut(
            strike=q.strike, bid=q.bid, ask=q.ask, last_price=q.last_price,
            volume=q.volume, open_interest=q.open_interest,
            implied_volatility=q.implied_volatility, contract_type=q.contract_type,
            in_the_money=q.in_the_money,
        )

    resp = {
        "ticker": ticker,
        "expiration": exp,
        "spot_price": chain.spot_price,
        "calls": [to_out(c) for c in chain.calls],
        "puts": [to_out(p) for p in chain.puts],
    }

    resp = enrich_with_index_data(resp, ticker, chain.spot_price, provider)

    return OptionsChainResponse(**resp)


@market_router.get("/greeks", response_model=GreeksResponse)
def get_greeks(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    provider: DataProvider = Depends(get_provider_dependency),
):
    """Get Greeks data for a ticker and expiration."""
    # Validate and normalize ticker
    normalized_ticker = TickerValidator.normalize_for_options(ticker)
    
    # Resolve expiration
    exp = _resolve_expiration(normalized_ticker, expiration, provider)
    
    # Get options chain
    chain = provider.get_options_chain(normalized_ticker, exp)

    T = max((exp - date.today()).days, 0) / 365.0
    r, q_div = settings.risk_free_rate, settings.dividend_yield_spy

    calls_by_strike = {c.strike: c for c in chain.calls}
    puts_by_strike = {p.strike: p for p in chain.puts}
    strikes = sorted(set(calls_by_strike) | set(puts_by_strike))

    out = []
    for K in strikes:
        call = calls_by_strike.get(K)
        put = puts_by_strike.get(K)
        cg = compute_greeks(chain.spot_price, K, T, r, q_div, call.implied_volatility, "call") if call and call.implied_volatility > 0 and T > 0 else None
        pg = compute_greeks(chain.spot_price, K, T, r, q_div, put.implied_volatility, "put") if put and put.implied_volatility > 0 and T > 0 else None
        out.append(GreeksAtStrike(
            strike=K,
            call_delta=cg.delta if cg else 0.0, call_gamma=cg.gamma if cg else 0.0,
            call_vega=cg.vega if cg else 0.0, call_theta=cg.theta if cg else 0.0,
            call_rho=cg.rho if cg else 0.0,
            put_delta=pg.delta if pg else 0.0, put_gamma=pg.gamma if pg else 0.0,
            put_vega=pg.vega if pg else 0.0, put_theta=pg.theta if pg else 0.0,
            put_rho=pg.rho if pg else 0.0,
        ))

    resp = {"ticker": ticker, "expiration": exp, "spot_price": chain.spot_price, "strikes": out}

    resp = enrich_with_index_data(resp, ticker, chain.spot_price, provider)

    return GreeksResponse(**resp)


@market_router.get("/gex", response_model=ExposureResponse)
@market_router.get("/dex", response_model=ExposureResponse)
def get_exposure(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    provider: DataProvider = Depends(get_provider_dependency),
):
    """Get gamma or delta exposure data."""
    # Validate and normalize ticker
    normalized_ticker = TickerValidator.normalize_for_options(ticker)
    
    # Resolve expiration
    exp = _resolve_expiration(normalized_ticker, expiration, provider)
    
    # Use the use case
    resp = get_exposure_use_case.execute(
        ticker=ticker,
        expiration=exp,
        provider=provider,
        convert_to_index_scale=True
    )

    return ExposureResponse(**resp)


@market_router.get("/maxpain", response_model=MaxPainResponse)
def get_max_pain(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    provider: DataProvider = Depends(get_provider_dependency),
):
    """Get max pain data."""
    # Validate and normalize ticker
    normalized_ticker = TickerValidator.normalize_for_options(ticker)
    
    # Resolve expiration
    exp = _resolve_expiration(normalized_ticker, expiration, provider)
    
    # Use the use case
    resp = get_exposure_use_case.get_max_pain(
        ticker=ticker,
        expiration=exp,
        provider=provider
    )

    return MaxPainResponse(**resp)


@market_router.get("/heatmap", response_model=HeatmapResponse)
def get_heatmap(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    metric: str = Query(default="delta_exposure", pattern="^(delta_exposure|volume|open_interest)$"),
    provider: DataProvider = Depends(get_provider_dependency),
):
    """Get heatmap data for visualization."""
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
    
    # Build exposure report
    from app.domain.application.services import MarketAnalyzerService
    report = MarketAnalyzerService.build_exposure_report(chain, date.today())
    spot = report.spot_price

    # Get index data for conversion
    index_ticker = None
    index_price = None
    index_ratio = None
    if isinstance(ticker, str) and ticker.upper() in {"SPY", "GSPC", "^GSPC"}:
        try:
            index_price = provider.get_index_price("^GSPC")
            if spot and spot > 0:
                index_ratio = index_price / spot
                index_ticker = "^GSPC"
        except Exception as e:
            index_price = None
            index_ratio = None
            index_ticker = None
            logger.exception("Failed to fetch index_price for heatmap of %s: %s", ticker, e)

    cells = []
    for s in report.strikes:
        strike_val = convert_strike(s.strike, index_ratio) if index_ratio else s.strike
        if metric == "delta_exposure":
            call_val = -(s.call_delta * s.call_oi * CONTRACT_MULTIPLIER * spot)
            put_val = -(s.put_delta * s.put_oi * CONTRACT_MULTIPLIER * spot)
            if index_ratio:
                call_val *= index_ratio
                put_val *= index_ratio
        elif metric == "open_interest":
            call_val, put_val = float(s.call_oi), float(s.put_oi)
        else:
            call_val, put_val = float(s.call_volume), float(s.put_volume)

        cells.append(HeatmapCell(strike=strike_val, metric_call=call_val, metric_put=put_val, strike_index=strike_val))

    return HeatmapResponse(
        ticker=ticker,
        expiration=exp,
        metric=metric,
        cells=cells,
        index_ticker=index_ticker,
        index_price=index_price,
        index_ratio=index_ratio,
    )
