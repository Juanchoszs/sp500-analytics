from datetime import date, datetime
from typing import Any
from fastapi import APIRouter, HTTPException, Query, Depends
import logging

from app.config import settings
from app.domain.application.services import MarketAnalyzerService
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

logger = logging.getLogger("app.routers.exposure")
router = APIRouter()

CONTRACT_MULTIPLIER = 100


def _strike_to_out(s, spot: float) -> StrikeExposureOut:
    """Serializa un StrikeExposure del dominio con desglose call/put para gráficos."""
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
        return expirations[0]  # el más próximo, comportamiento por defecto
    try:
        target = datetime.strptime(expiration, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "El parámetro 'expiration' debe tener formato YYYY-MM-DD")
    if target not in expirations:
        raise HTTPException(404, f"'{expiration}' no es un vencimiento válido para {ticker}")
    return target


@router.get("/options", response_model=OptionsChainResponse)
def get_options(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None, description="YYYY-MM-DD; por defecto, el vencimiento más próximo"),
    provider: DataProvider = Depends(get_provider_dependency),
):
    exp = _resolve_expiration(ticker, expiration, provider)
    chain = provider.get_options_chain(ticker, exp)

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


@router.get("/greeks", response_model=GreeksResponse)
def get_greeks(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    provider: DataProvider = Depends(get_provider_dependency),
):
    exp = _resolve_expiration(ticker, expiration, provider)
    chain = provider.get_options_chain(ticker, exp)

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


@router.get("/gex", response_model=ExposureResponse)
@router.get("/dex", response_model=ExposureResponse)
def get_exposure(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    provider: DataProvider = Depends(get_provider_dependency),
):
    exp = _resolve_expiration(ticker, expiration, provider)
    chain = _get_options_chain_with_spy_fallback(ticker, exp, provider)
    report = MarketAnalyzerService.build_exposure_report(chain, date.today())

    resp = {
        "ticker": ticker,
        "expiration": exp,
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
        "strikes": [_strike_to_out(s, report.spot_price).model_dump() for s in report.strikes],
    }

    # Convert SPY to GSPC scale for display
    if ticker == "SPY":
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

    return ExposureResponse(**resp)


@router.get("/maxpain", response_model=MaxPainResponse)
def get_max_pain(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    provider: DataProvider = Depends(get_provider_dependency),
):
    exp = _resolve_expiration(ticker, expiration, provider)
    chain = provider.get_options_chain(ticker, exp)
    report = MarketAnalyzerService.build_exposure_report(chain, date.today())

    distance_pct = None
    if report.max_pain:
        distance_pct = ((report.spot_price - report.max_pain) / report.spot_price) * 100

    resp = {
        "ticker": ticker,
        "expiration": exp,
        "max_pain": report.max_pain,
        "spot_price": report.spot_price,
        "distance_pct": distance_pct,
    }

    resp = enrich_with_index_data(resp, ticker, report.spot_price, provider)

    # Add max_pain_index if we have index data and max_pain
    if ticker == "SPY" and "index_ratio" in resp and report.max_pain is not None:
        resp["max_pain_index"] = round(report.max_pain * resp["index_ratio"], 2)

    return MaxPainResponse(**resp)


@router.get("/heatmap", response_model=HeatmapResponse)
def get_heatmap(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    metric: str = Query(default="delta_exposure", pattern="^(delta_exposure|volume|open_interest)$"),
    provider: DataProvider = Depends(get_provider_dependency),
):
    exp = _resolve_expiration(ticker, expiration, provider)
    chain = _get_options_chain_with_spy_fallback(ticker, exp, provider)
    report = MarketAnalyzerService.build_exposure_report(chain, date.today())
    spot = report.spot_price

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
