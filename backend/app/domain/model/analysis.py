from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from datetime import date


@dataclass(frozen=True)
class GammaAnalysis:
    net_gamma_exposure: float
    call_wall: Optional[float]
    put_wall: Optional[float]
    gamma_wall: Optional[float]
    zero_gamma: Optional[float]
    gamma_flip_distance_pct: Optional[float]
    is_gamma_flip_close: bool
    regime_type: str  # "positive" | "negative" | "neutral"
    description: str
    risks: List[str]
    expected_behavior: str


@dataclass(frozen=True)
class DeltaAnalysis:
    net_delta_exposure: float
    call_dex_wall: Optional[float]
    put_dex_wall: Optional[float]
    regime_type: str  # "call_dominated" | "put_dominated" | "neutral"
    description: str
    hedging_pressure: str


@dataclass(frozen=True)
class OptionsAnalysis:
    put_call_oi_ratio: float
    put_call_volume_ratio: float
    high_liquidity_strikes: List[float]
    regime_type: str  # "call_dominated" | "put_dominated" | "neutral"
    sentiment_description: str
    liquidity_zones: str


@dataclass(frozen=True)
class VolatilityAnalysis:
    vix_current: float
    vix_rank: float  # 0 a 100
    vix_percentile: float  # 0 a 100
    atm_iv: float
    expected_move_iv: float
    expected_move_straddle: float
    expected_move_used: float  # el seleccionado para los límites
    lower_bound: float
    upper_bound: float
    regime_type: str  # "high_volatility" | "low_volatility" | "neutral"
    description: str
    historical_vix_min: float
    historical_vix_max: float


@dataclass(frozen=True)
class DealerAnalysis:
    net_gamma_exposure: float
    net_delta_exposure: float
    dealer_gamma_regime: str  # "long_gamma" | "short_gamma"
    dealer_delta_regime: str  # "long_delta" | "short_delta"
    hedging_style: str  # "mean_reversion" | "momentum_following"
    description: str
    hedging_impact: str


@dataclass(frozen=True)
class DeltaHedgingStrength:
    score: float  # 0 a 100
    classification: str  # Very Weak | Weak | Neutral | Strong | Very Strong
    net_dex: float
    net_gex: float
    factors: Dict[str, float]
    description: str


@dataclass(frozen=True)
class AnomalyItem:
    category: str
    severity: str
    score: float
    description: str
    impact: str
    z_score: Optional[float] = None
    timestamp: Optional[str] = None


@dataclass(frozen=True)
class YieldAnomalyReport:
    score: float
    expected_direction: str
    confidence: str
    current_price: float
    current_log_return: float
    anomalies: List[Dict[str, Any]]
    summary: str
    historical_context: Dict[str, Any]
    price_history: List[Dict[str, Any]]
    anomaly_markers: List[Dict[str, Any]]
    ohlc_data: List[Dict[str, Any]]
    log_returns_data: List[Dict[str, Any]]
    upper_threshold: List[Dict[str, Any]]
    lower_threshold: List[Dict[str, Any]]


@dataclass(frozen=True)
class AnalysisScores:
    bullish_score: float
    bearish_score: float
    neutral_score: float
    overall_sentiment: str


@dataclass(frozen=True)
class AnalysisConfidence:
    overall_confidence: float
    data_quality_score: float
    model_confidence: float
    factors: Dict[str, float]


@dataclass(frozen=True)
class MarketRegime:
    gamma_regime: str
    delta_regime: str
    volatility_regime: str
    options_regime: str
    overall_regime: str
    description: str


@dataclass(frozen=True)
class MarketScenario:
    scenario_type: str  # "bullish" | "bearish" | "neutral"
    probability: float
    price_target: Optional[float]
    description: str
    key_drivers: List[str]


@dataclass(frozen=True)
class ComprehensiveAnalysis:
    ticker: str
    expiration: date
    spot_price: float
    gamma: GammaAnalysis
    delta: DeltaAnalysis
    options: OptionsAnalysis
    volatility: VolatilityAnalysis
    dealer: DealerAnalysis
    hedging_strength: Optional[DeltaHedgingStrength]
    yield_anomaly: Optional[YieldAnomalyReport]
    scores: AnalysisScores
    confidence: AnalysisConfidence
    regime: MarketRegime
    scenarios: List[MarketScenario]
    max_pain: Optional[float]
    fetched_at: Optional[str]
