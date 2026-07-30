"""Modelos de respuesta (Pydantic) — el contrato tipado que ve el frontend."""
from datetime import date
from typing import Any, Literal

from pydantic import BaseModel


class PriceResponse(BaseModel):
    ticker: str
    price: float
    fetched_at: str


class OptionQuoteOut(BaseModel):
    strike: float
    bid: float
    ask: float
    last_price: float
    volume: int
    open_interest: int
    implied_volatility: float
    contract_type: str
    in_the_money: bool


class OptionsChainResponse(BaseModel):
    ticker: str
    expiration: date
    spot_price: float
    calls: list[OptionQuoteOut]
    puts: list[OptionQuoteOut]
    # Información del índice de referencia (cuando ticker == "SPY")
    index_ticker: str | None = None
    index_price: float | None = None
    index_ratio: float | None = None
    spot_price_index: float | None = None


class GreeksAtStrike(BaseModel):
    strike: float
    call_delta: float
    call_gamma: float
    call_vega: float
    call_theta: float
    call_rho: float
    put_delta: float
    put_gamma: float
    put_vega: float
    put_theta: float
    put_rho: float


class GreeksResponse(BaseModel):
    ticker: str
    expiration: date
    spot_price: float
    strikes: list[GreeksAtStrike]
    # Index reference
    index_ticker: str | None = None
    index_price: float | None = None
    index_ratio: float | None = None
    spot_price_index: float | None = None


class StrikeExposureOut(BaseModel):
    strike: float
    call_oi: int
    put_oi: int
    call_volume: int
    put_volume: int
    gamma_exposure: float
    delta_exposure: float
    vega_exposure: float
    call_delta_exposure: float = 0.0
    put_delta_exposure: float = 0.0
    call_gamma_exposure: float = 0.0
    put_gamma_exposure: float = 0.0


class ExposureResponse(BaseModel):
    ticker: str
    expiration: date
    spot_price: float
    net_gamma_exposure: float
    net_delta_exposure: float
    net_vega_exposure: float
    call_wall: float | None
    put_wall: float | None
    gamma_wall: float | None
    zero_gamma: float | None
    max_pain: float | None
    put_call_oi_ratio: float
    put_call_volume_ratio: float
    high_liquidity_strikes: list[float]
    pinning_probability: dict[str, float]
    strikes: list[StrikeExposureOut]
    # Index reference and converted levels (cuando ticker == "SPY")
    index_ticker: str | None = None
    index_price: float | None = None
    index_ratio: float | None = None
    call_wall_index: float | None = None
    put_wall_index: float | None = None
    zero_gamma_index: float | None = None


class MaxPainResponse(BaseModel):
    ticker: str
    expiration: date
    max_pain: float | None
    spot_price: float
    distance_pct: float | None
    # Index reference
    index_ticker: str | None = None
    index_price: float | None = None
    index_ratio: float | None = None
    max_pain_index: float | None = None


class HeatmapCell(BaseModel):
    strike: float
    metric_call: float
    metric_put: float
    # Nivel de strike mapeado al índice (ej. strike * index_ratio). Opcional — frontend lo usará si está presente
    strike_index: float | None = None


class HeatmapResponse(BaseModel):
    ticker: str
    expiration: date
    metric: str  # "gamma_exposure" | "open_interest" | "volume" | "delta_exposure"
    cells: list[HeatmapCell]
    # Información del índice de referencia (cuando los datos provienen de SPY y se grafican en GSPC)
    index_ticker: str | None = None
    index_price: float | None = None
    index_ratio: float | None = None


class ExpirationsResponse(BaseModel):
    ticker: str
    expirations: list[date]


class GammaAnalysisResponse(BaseModel):
    net_gamma_exposure: float
    call_wall: float | None
    put_wall: float | None
    gamma_wall: float | None
    zero_gamma: float | None
    gamma_flip_distance_pct: float | None
    is_gamma_flip_close: bool
    regime_type: str
    description: str
    risks: list[str]
    expected_behavior: str


class DeltaAnalysisResponse(BaseModel):
    net_delta_exposure: float
    call_dex_wall: float | None
    put_dex_wall: float | None
    regime_type: str
    description: str
    hedging_pressure: str


class OptionsAnalysisResponse(BaseModel):
    put_call_oi_ratio: float
    put_call_volume_ratio: float
    high_liquidity_strikes: list[float]
    regime_type: str
    sentiment_description: str
    liquidity_zones: str


class VolatilityAnalysisResponse(BaseModel):
    vix_current: float
    vix_rank: float
    vix_percentile: float
    atm_iv: float
    expected_move_iv: float
    expected_move_straddle: float
    expected_move_used: float
    lower_bound: float
    upper_bound: float
    regime_type: str
    description: str
    historical_vix_min: float
    historical_vix_max: float


class DealerAnalysisResponse(BaseModel):
    net_gamma_exposure: float
    net_delta_exposure: float
    dealer_gamma_regime: str
    dealer_delta_regime: str
    hedging_style: str
    description: str
    hedging_impact: str


class IntelligenceScoresResponse(BaseModel):
    bullish_score: float
    bearish_score: float
    volatility_score: float
    dealer_support_score: float
    gamma_strength: float
    trend_strength: float
    risk_score: float
    explanations: dict[str, str]


class ConfidenceDetailsResponse(BaseModel):
    level: str
    consistency_score: float
    factors: list[str]
    conflicting_factors: list[str]


class RegimeDetailsResponse(BaseModel):
    name: str
    active: bool
    description: str
    characteristics: list[str]
    risks: list[str]
    expected_behavior: str
    confidence: str


class ScenarioResponse(BaseModel):
    name: str
    confidence: str
    probability_pct: float
    narrative: str
    supporting_factors: list[str]
    invalidation_conditions: list[str]
    probability_boosters: list[str]
    probability_decliners: list[str]


class ScenarioCollectionResponse(BaseModel):
    principal: ScenarioResponse
    alternative: ScenarioResponse
    risk: ScenarioResponse


class IntelligenceResponse(BaseModel):
    ticker: str
    expiration: date
    spot_price: float
    fetched_at: str
    gamma_analysis: GammaAnalysisResponse
    delta_analysis: DeltaAnalysisResponse
    options_analysis: OptionsAnalysisResponse
    volatility_analysis: VolatilityAnalysisResponse
    dealer_analysis: DealerAnalysisResponse
    scores: IntelligenceScoresResponse
    confidence: ConfidenceDetailsResponse
    regimes: list[RegimeDetailsResponse]
    scenarios: ScenarioCollectionResponse
    narrative: str
    # Index reference
    index_ticker: str | None = None
    index_price: float | None = None
    index_ratio: float | None = None


class QueryResponse(BaseModel):
    question_key: str
    answer: str
    justification_data: dict[str, float | str | list[float] | None]
    confidence: str


class QuestionItem(BaseModel):
    key: str
    label: str
    category: str


class QuestionsListResponse(BaseModel):
    questions: list[QuestionItem]


class HedgingStrengthResponse(BaseModel):
    score: float
    classification: str
    net_dex: float
    net_gex: float
    factors: dict[str, float]
    description: str


class AnomalyItemOut(BaseModel):
    category: str
    severity: str
    score: float
    description: str
    impact: str
    z_score: float | None = None


class YieldAnomalyResponse(BaseModel):
    score: float
    expected_direction: Literal["Bullish", "Bearish", "Neutral"]
    confidence: Literal["Low", "Medium", "High"]
    current_price: float
    current_log_return: float
    anomalies: list[AnomalyItemOut]
    summary: str
    historical_context: dict[str, Any]
    price_history: list[dict[str, Any]]
    anomaly_markers: list[dict[str, Any]]
    ohlc_data: list[dict[str, Any]]
    log_returns_data: list[dict[str, Any]]
    upper_threshold: list[dict[str, Any]]
    lower_threshold: list[dict[str, Any]]
