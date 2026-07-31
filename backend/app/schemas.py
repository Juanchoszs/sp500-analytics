"""Modelos de respuesta (Pydantic) — el contrato tipado que ve el frontend."""
from datetime import date, datetime
from typing import Any, Literal
from enum import Enum

from pydantic import BaseModel, Field


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


# Evidence Engine Schemas

class EvidenceTypeEnum(str, Enum):
    """Enumeration for evidence types."""
    SUPPORTING = "supporting"
    CONTRADICTING = "contradicting"
    MISSING = "missing"
    NEUTRAL = "neutral"


class SourceReliabilityEnum(str, Enum):
    """Enumeration for source reliability levels."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNKNOWN = "unknown"


class EvidenceItemOut(BaseModel):
    """Schema for individual evidence items."""
    type: EvidenceTypeEnum
    source: str
    value: Any
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    reliability: SourceReliabilityEnum
    timestamp: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    weight: float = Field(description="Calculated weight based on confidence and reliability")


class EvidenceSummaryOut(BaseModel):
    """Schema for evidence collection summary."""
    conclusion: str
    supporting_count: int
    contradicting_count: int
    missing_count: int
    neutral_count: int
    total_confidence: float = Field(ge=0.0, le=1.0)
    evidence_quality_score: float = Field(ge=0.0, le=1.0)
    supporting_weight: float
    contradicting_weight: float
    generated_at: str


class EvidenceCollectionOut(BaseModel):
    """Schema for complete evidence collection."""
    conclusion: str
    supporting_evidence: list[EvidenceItemOut]
    contradicting_evidence: list[EvidenceItemOut]
    missing_evidence: list[EvidenceItemOut]
    neutral_evidence: list[EvidenceItemOut]
    summary: EvidenceSummaryOut


class ConflictDetectionOut(BaseModel):
    """Schema for conflict detection results."""
    type: str
    description: str
    supporting_count: int
    contradicting_count: int
    severity: str


class EvidenceGapOut(BaseModel):
    """Schema for evidence gap descriptions."""
    gap_description: str
    source: str
    metric: str | None = None


class EvidenceReportOut(BaseModel):
    """Schema for complete evidence report."""
    conclusion: str
    collection: EvidenceCollectionOut
    conflicts: list[ConflictDetectionOut]
    gaps: list[EvidenceGapOut]
    generated_report: str
    total_confidence: float = Field(ge=0.0, le=1.0)
    evidence_quality_score: float = Field(ge=0.0, le=1.0)


# Prediction Tracking Schemas

class PredictionTypeEnum(str, Enum):
    """Enumeration for prediction types."""
    DIRECTIONAL = "directional"
    VOLATILITY = "volatility"
    REGIME = "regime"
    PRICE_TARGET = "price_target"
    SCENARIO = "scenario"


class PredictionOutcomeEnum(str, Enum):
    """Enumeration for prediction outcomes."""
    CORRECT = "correct"
    INCORRECT = "incorrect"
    PARTIAL = "partial"
    PENDING = "pending"
    INCONCLUSIVE = "inconclusive"
    
    @property
    def value(self):
        return self._value_


class PredictionCreateIn(BaseModel):
    """Schema for creating a new prediction."""
    ticker: str = Field(..., description="Ticker symbol")
    prediction_type: PredictionTypeEnum = Field(..., description="Type of prediction")
    prediction_key: str = Field(..., description="Unique key for the prediction")
    predicted_value: str = Field(..., description="Predicted value (can be text or serialized number)")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    reasoning: str | None = Field(None, description="Explanation for the prediction")
    spot_price: float | None = Field(None, description="Current spot price")
    expiration: str | None = Field(None, description="Options expiration if applicable")
    market_regime: str | None = Field(None, description="Market regime at prediction time")
    vix_level: float | None = Field(None, description="VIX level at prediction time")
    net_gex: float | None = Field(None, description="Net gamma exposure at prediction time")
    net_dex: float | None = Field(None, description="Net delta exposure at prediction time")
    target_evaluation_time: datetime | None = Field(None, description="When the prediction should be evaluated")


class PredictionOut(BaseModel):
    """Schema for prediction output."""
    id: int
    ticker: str
    prediction_type: str
    prediction_key: str
    predicted_value: str
    confidence_score: float
    confidence_adjusted: float | None = None
    reasoning: str | None = None
    spot_price: float | None = None
    expiration: str | None = None
    market_regime: str | None = None
    vix_level: float | None = None
    net_gex: float | None = None
    net_dex: float | None = None
    created_at: datetime
    target_evaluation_time: datetime | None = None
    evaluated_at: datetime | None = None
    outcome: str | None = None
    actual_value: str | None = None
    error_margin: float | None = None
    evaluation_notes: str | None = None
    calibration_error: float | None = None
    
    class Config:
        from_attributes = True


class PredictionEvaluateIn(BaseModel):
    """Schema for evaluating a prediction."""
    actual_value: str = Field(..., description="Actual observed value")
    outcome: PredictionOutcomeEnum = Field(..., description="Evaluation outcome")
    evaluation_method: str = Field(default="automatic", description="Method used for evaluation")
    notes: str | None = Field(None, description="Additional evaluation notes")


class AccuracyMetricsOut(BaseModel):
    """Schema for accuracy metrics output."""
    total_predictions: int
    correct_predictions: int
    accuracy_rate: float = Field(ge=0.0, le=1.0)
    precision: float = Field(ge=0.0, le=1.0)
    recall: float = Field(ge=0.0, le=1.0)
    f1_score: float = Field(ge=0.0, le=1.0)
    calibration_error: float = Field(ge=0.0, le=1.0)
    calibration_score: float = Field(ge=0.0, le=1.0)


class ConfidenceAdjustmentOut(BaseModel):
    """Schema for confidence adjustment output."""
    original_confidence: float
    adjusted_confidence: float
    adjustment_factor: float
    historical_accuracy: float
    confidence_level: str


class CalibrationReportOut(BaseModel):
    """Schema for calibration report output."""
    ticker: str
    prediction_type: str
    total_evaluated: int
    calibration_score: float = Field(ge=0.0, le=1.0)
    average_calibration_error: float
    by_confidence_level: dict[str, dict[str, Any]]


class PredictionMetricsOut(BaseModel):
    """Schema for aggregated prediction metrics."""
    ticker: str
    prediction_type: str
    time_window: str
    total_predictions: int
    correct_predictions: int
    accuracy_rate: float
    avg_precision: float | None = None
    avg_recall: float | None = None
    avg_f1: float | None = None
    avg_confidence: float | None = None
    avg_calibration_error: float | None = None
    calibration_score: float | None = None
    high_conf_accuracy: float | None = None
    medium_conf_accuracy: float | None = None
    low_conf_accuracy: float | None = None
    improving_trend: float | None = None
    last_updated: datetime
    
    class Config:
        from_attributes = True
