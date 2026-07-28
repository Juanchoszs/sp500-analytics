"""
Endpoints públicos de la API. Cada handler es deliberadamente delgado:
obtiene datos crudos del provider, delega el cálculo a analytics/greeks,
y serializa con los schemas de app/schemas.py. Ningún cálculo financiero
vive dentro de un router.
"""
from datetime import date, datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
import logging

logger = logging.getLogger("app.routers.market")

from app.domain.application.services import MarketAnalyzerService
from app.analytics.market_analyzer import MarketAnalyzer
from app.analytics.query_engine import QueryEngine
from app.config import settings
from app.greeks.black_scholes import compute_greeks
from app.providers import get_provider
from app.schemas import (
    ExposureResponse, ExpirationsResponse, GreeksAtStrike, GreeksResponse,
    HeatmapCell, HeatmapResponse, MaxPainResponse, OptionQuoteOut,
    OptionsChainResponse, PriceResponse, StrikeExposureOut,
    IntelligenceResponse, QueryResponse, QuestionsListResponse,
    HedgingStrengthResponse, YieldAnomalyResponse,
)
from app.analytics.index_converter import calculate_index_ratio, convert_exposure_dict, convert_strike
from app.analytics.docx_generator import generate_docx_report
from app.analytics.hedging_strength import HedgingStrengthAnalyzer
from app.analytics.yield_anomaly import YieldAnomalyAnalyzer

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


def _get_options_chain_with_spy_fallback(ticker: str, exp: date):
    provider = get_provider()
    try:
        return provider.get_options_chain(ticker, exp)
    except Exception as exc:
        if isinstance(ticker, str) and ticker.upper() in ("^GSPC", "GSPC"):
            logger.warning("Options chain for %s failed, falling back to SPY: %s", ticker, exc)
            try:
                return provider.get_options_chain("SPY", exp)
            except Exception:
                spy_exp = _resolve_expiration("SPY", exp.strftime("%Y-%m-%d"))
                return provider.get_options_chain("SPY", spy_exp)
        raise


def _resolve_expiration(ticker: str, expiration: str | None) -> date:
    provider = get_provider()
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


@router.get("/price")
def get_price(
    ticker: str = Query(default=settings.default_ticker),
    index_ticker: str | None = Query(default=None, description="Ticker del índice de referencia (ej: GSPC)")
):
    provider = get_provider()
    price = provider.get_spot_price(ticker)
    index_price = None
    index_ticker_formatted = None
    
    if ticker == "SPY" and index_ticker is None:
        index_ticker = "GSPC"
    
    if index_ticker:
        try:
            index_ticker_formatted = index_ticker if index_ticker.startswith("^") else f"^{index_ticker}"
            index_price = provider.get_index_price(index_ticker_formatted)
        except Exception as e:
            index_price = None
            logger.exception("Failed to fetch index_price for %s: %s", index_ticker, e)
    
    response = {
        "ticker": ticker,
        "price": price,
        "fetched_at": datetime.now(timezone.utc).isoformat()
    }
    
    if index_price is not None and index_ticker_formatted is not None:
        response["index_price"] = index_price
        response["index_ticker"] = index_ticker_formatted
        if ticker == "SPY" and index_ticker_formatted == "^GSPC" and price > 0:
            ratio = calculate_index_ratio(price, index_price)
            response["index_ratio"] = ratio
    
    return response


@router.get("/expirations", response_model=ExpirationsResponse)
def get_expirations(ticker: str = Query(default=settings.default_ticker)):
    provider = get_provider()
    return ExpirationsResponse(ticker=ticker, expirations=provider.get_expirations(ticker))


@router.get("/options", response_model=OptionsChainResponse)
def get_options(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None, description="YYYY-MM-DD; por defecto, el vencimiento más próximo"),
):
    exp = _resolve_expiration(ticker, expiration)
    provider = get_provider()
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

    if ticker == "SPY":
        try:
            index_price = provider.get_index_price("^GSPC")
            if index_price and chain.spot_price > 0:
                ratio = calculate_index_ratio(chain.spot_price, index_price)
                resp["index_ticker"] = "^GSPC"
                resp["index_price"] = index_price
                resp["index_ratio"] = ratio
                resp["spot_price_index"] = chain.spot_price * ratio
        except Exception as e:
            logger.exception("Failed to fetch index_price for options of %s: %s", ticker, e)

    return OptionsChainResponse(**resp)


@router.get("/greeks", response_model=GreeksResponse)
def get_greeks(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
):
    exp = _resolve_expiration(ticker, expiration)
    provider = get_provider()
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

    if ticker == "SPY":
        try:
            index_price = provider.get_index_price("^GSPC")
            if index_price and chain.spot_price > 0:
                ratio = calculate_index_ratio(chain.spot_price, index_price)
                resp["index_ticker"] = "^GSPC"
                resp["index_price"] = index_price
                resp["index_ratio"] = ratio
                resp["spot_price_index"] = chain.spot_price * ratio
        except Exception as e:
            logger.exception("Failed to fetch index_price for greeks of %s: %s", ticker, e)

    return GreeksResponse(**resp)


@router.get("/gex", response_model=ExposureResponse)
@router.get("/dex", response_model=ExposureResponse)
def get_exposure(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
):
    exp = _resolve_expiration(ticker, expiration)
    chain = _get_options_chain_with_spy_fallback(ticker, exp)
    report = MarketAnalyzerService.build_exposure_report(chain, date.today())
    provider = get_provider()

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

    if ticker == "SPY":
        try:
            index_price = provider.get_index_price("^GSPC")
            if index_price and report.spot_price > 0:
                ratio = calculate_index_ratio(report.spot_price, index_price)
                resp = convert_exposure_dict(resp, ratio, index_price)
        except Exception as e:
            logger.exception("Failed to fetch index_price for exposure of %s: %s", ticker, e)

    return ExposureResponse(**resp)


@router.get("/maxpain", response_model=MaxPainResponse)
def get_max_pain(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
):
    exp = _resolve_expiration(ticker, expiration)
    provider = get_provider()
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

    # Añadir referencia índice si procede
    if ticker == "SPY":
        try:
            index_price = provider.get_index_price("^GSPC")
            if index_price and report.spot_price > 0 and report.max_pain is not None:
                ratio = index_price / report.spot_price
                resp["index_ticker"] = "^GSPC"
                resp["index_price"] = index_price
                resp["index_ratio"] = ratio
                resp["max_pain_index"] = round(report.max_pain * ratio, 2)
        except Exception as e:
            logger.exception("Failed to fetch index_price for max_pain of %s: %s", ticker, e)

    return MaxPainResponse(**resp)


@router.get("/heatmap", response_model=HeatmapResponse)
def get_heatmap(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    metric: str = Query(default="delta_exposure", pattern="^(delta_exposure|volume|open_interest)$"),
):
    exp = _resolve_expiration(ticker, expiration)
    provider = get_provider()
    chain = _get_options_chain_with_spy_fallback(ticker, exp)
    report = MarketAnalyzerService.build_exposure_report(chain, date.today())
    spot = report.spot_price

    # Si el origen es SPY o GSPC, obtener precio del índice de referencia (^GSPC) y calcular ratio.
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
            # No bloquear la respuesta si la consulta del índice falla; devolver cells sin mapeo
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


@router.get("/intelligence", response_model=None)
def get_intelligence(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
):
    exp = _resolve_expiration(ticker, expiration)
    report = MarketAnalyzer.generate_intelligence_report(ticker, exp)
    
    # Convertir a dict para poder agregar campos adicionales
    report_dict = report.model_dump() if hasattr(report, 'model_dump') else report

    # Para SPY, automáticamente agregar referencia al índice S&P 500
    if ticker == "SPY":
        try:
            provider = get_provider()
            index_price = provider.get_index_price("^GSPC")
            spy_price = report.get("spot_price", 0) if isinstance(report, dict) else report_dict.get("spot_price", 0)

            if index_price and spy_price > 0:
                ratio = calculate_index_ratio(spy_price, index_price)
                report_dict["index_price"] = index_price
                report_dict["index_ticker"] = "^GSPC"
                report_dict["index_ratio"] = ratio

                # Niveles clave en escala ^GSPC (extraídos de gamma_analysis)
                gamma = report_dict.get("gamma_analysis") or {}
                if isinstance(gamma, dict):
                    for level_key in ("call_wall", "put_wall", "zero_gamma"):
                        val = gamma.get(level_key)
                        if val is not None:
                            report_dict[f"{level_key}_index"] = round(val * ratio, 2)
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
):
    exp = _resolve_expiration(ticker, expiration)
    report = MarketAnalyzer.generate_intelligence_report(ticker, exp)
    answer_dict = QueryEngine.answer_question(question_key, report["query_context"])
    return QueryResponse(
        question_key=answer_dict["question_key"],
        answer=answer_dict["answer"],
        justification_data=answer_dict["justification_data"],
        confidence=answer_dict["confidence"]
    )


@router.get("/download-report")
def download_report(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
):
    exp = _resolve_expiration(ticker, expiration)
    provider = get_provider()

    # Generar el reporte de inteligencia (se usa SPY para la analítica)
    report = MarketAnalyzer.generate_intelligence_report(ticker, exp)

    # Construir la exposición analítica basada en el ticker original
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

    # Decidir la fuente de exposición para generar gráficos:
    # - Si el ticker es SPY y hay un ratio válido, representar los niveles como equivalencia en ^GSPC.
    # - Siempre construir gráficos con datos disponibles, incluso si la cadena de ^GSPC no está accesible.
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
            index_exp = _resolve_expiration(index_ticker, expiration)
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

    # Normalizar report a dict si es un modelo Pydantic/objeto
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
    )

    # Obtener bytes del buffer
    buf_bytes = docx_buffer.getvalue() if hasattr(docx_buffer, "getvalue") else bytes(docx_buffer)

    import io

    # Nombre de archivo dinámico y cabeceras para evitar caching en clientes que refrescan
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
):
    exp = _resolve_expiration(ticker, expiration)
    chain = _get_options_chain_with_spy_fallback(ticker, exp)
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
def get_yield_anomaly():
    result = YieldAnomalyAnalyzer.analyze()
    return YieldAnomalyResponse(
        score=result.score,
        expected_direction=result.expected_direction,
        confidence=result.confidence,
        curve_spread_2_10=result.curve_spread_2_10,
        credit_spread_ratio=result.credit_spread_ratio,
        anomalies=result.anomalies,
        summary=result.summary,
    )
