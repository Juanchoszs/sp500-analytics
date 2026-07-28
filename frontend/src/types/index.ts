export interface PriceResponse {
  ticker: string;
  price: number;
  fetched_at: string;
}

export interface ExpirationsResponse {
  ticker: string;
  expirations: string[];
}

export interface OptionQuoteOut {
  strike: number;
  bid: number;
  ask: number;
  last_price: number;
  volume: number;
  open_interest: number;
  implied_volatility: number;
  contract_type: "call" | "put";
  in_the_money: boolean;
}

export interface OptionsChainResponse {
  ticker: string;
  expiration: string;
  spot_price: number;
  calls: OptionQuoteOut[];
  puts: OptionQuoteOut[];
  index_ticker?: string | null;
  index_price?: number | null;
  index_ratio?: number | null;
  spot_price_index?: number | null;
}

export interface GreeksAtStrike {
  strike: number;
  call_delta: number;
  call_gamma: number;
  call_vega: number;
  call_theta: number;
  call_rho: number;
  put_delta: number;
  put_gamma: number;
  put_vega: number;
  put_theta: number;
  put_rho: number;
}

export interface GreeksResponse {
  ticker: string;
  expiration: string;
  spot_price: number;
  strikes: GreeksAtStrike[];
  index_ticker?: string | null;
  index_price?: number | null;
  index_ratio?: number | null;
  spot_price_index?: number | null;
}

export interface StrikeExposureOut {
  strike: number;
  call_oi: number;
  put_oi: number;
  call_volume: number;
  put_volume: number;
  gamma_exposure: number;
  delta_exposure: number;
  vega_exposure: number;
  call_delta_exposure?: number;
  put_delta_exposure?: number;
  call_gamma_exposure?: number;
  put_gamma_exposure?: number;
}

export interface ExposureResponse {
  ticker: string;
  expiration: string;
  spot_price: number;
  net_gamma_exposure: number;
  net_delta_exposure: number;
  net_vega_exposure: number;
  call_wall: number | null;
  put_wall: number | null;
  gamma_wall: number | null;
  zero_gamma: number | null;
  max_pain: number | null;
  put_call_oi_ratio: number;
  put_call_volume_ratio: number;
  high_liquidity_strikes: number[];
  pinning_probability: Record<string, number>;
  strikes: StrikeExposureOut[];
  index_ticker?: string | null;
  index_price?: number | null;
  index_ratio?: number | null;
  call_wall_index?: number | null;
  put_wall_index?: number | null;
  zero_gamma_index?: number | null;
}

export interface MaxPainResponse {
  ticker: string;
  expiration: string;
  max_pain: number | null;
  spot_price: number;
  distance_pct: number | null;
  index_ticker?: string | null;
  index_price?: number | null;
  index_ratio?: number | null;
  max_pain_index?: number | null;
}

export interface HeatmapCell {
  strike: number;
  metric_call: number;
  metric_put: number;
  strike_index?: number | null;
}

export interface HeatmapResponse {
  ticker: string;
  expiration: string;
  metric: string;
  cells: HeatmapCell[];
  index_ticker?: string | null;
  index_price?: number | null;
  index_ratio?: number | null;
}

export interface GammaAnalysisResponse {
  net_gamma_exposure: number;
  call_wall: number | null;
  put_wall: number | null;
  gamma_wall: number | null;
  zero_gamma: number | null;
  gamma_flip_distance_pct: number | null;
  is_gamma_flip_close: boolean;
  regime_type: string;
  description: string;
  risks: string[];
  expected_behavior: string;
}

export interface DeltaAnalysisResponse {
  net_delta_exposure: number;
  call_dex_wall: number | null;
  put_dex_wall: number | null;
  regime_type: string;
  description: string;
  hedging_pressure: string;
}

export interface OptionsAnalysisResponse {
  put_call_oi_ratio: number;
  put_call_volume_ratio: number;
  high_liquidity_strikes: number[];
  regime_type: string;
  sentiment_description: string;
  liquidity_zones: string;
}

export interface VolatilityAnalysisResponse {
  vix_current: number;
  vix_rank: number;
  vix_percentile: number;
  atm_iv: number;
  expected_move_iv: number;
  expected_move_straddle: number;
  expected_move_used: number;
  lower_bound: number;
  upper_bound: number;
  regime_type: string;
  description: string;
  historical_vix_min: number;
  historical_vix_max: number;
}

export interface DealerAnalysisResponse {
  net_gamma_exposure: number;
  net_delta_exposure: number;
  dealer_gamma_regime: string;
  dealer_delta_regime: string;
  hedging_style: string;
  description: string;
  hedging_impact: string;
}

export interface IntelligenceScoresResponse {
  bullish_score: number;
  bearish_score: number;
  volatility_score: number;
  dealer_support_score: number;
  gamma_strength: number;
  trend_strength: number;
  risk_score: number;
  explanations: Record<string, string>;
}

export interface ConfidenceDetailsResponse {
  level: string;
  consistency_score: number;
  factors: string[];
  conflicting_factors: string[];
}

export interface RegimeDetailsResponse {
  name: string;
  active: boolean;
  description: string;
  characteristics: string[];
  risks: string[];
  expected_behavior: string;
  confidence: string;
}

export interface ScenarioResponse {
  name: string;
  confidence: string;
  probability_pct: number;
  narrative: string;
  supporting_factors: string[];
  invalidation_conditions: string[];
  probability_boosters: string[];
  probability_decliners: string[];
}

export interface ScenarioCollectionResponse {
  principal: ScenarioResponse;
  alternative: ScenarioResponse;
  risk: ScenarioResponse;
}

export interface IntelligenceResponse {
  ticker: string;
  expiration: string;
  spot_price: number;
  fetched_at: string;
  gamma_analysis: GammaAnalysisResponse;
  delta_analysis: DeltaAnalysisResponse;
  options_analysis: OptionsAnalysisResponse;
  volatility_analysis: VolatilityAnalysisResponse;
  dealer_analysis: DealerAnalysisResponse;
  scores: IntelligenceScoresResponse;
  confidence: ConfidenceDetailsResponse;
  regimes: RegimeDetailsResponse[];
  scenarios: ScenarioCollectionResponse;
  narrative: string;
  index_ticker?: string | null;
  index_price?: number | null;
  index_ratio?: number | null;
}

export interface QuestionItem {
  key: string;
  label: string;
  category: string;
}

export interface QuestionsListResponse {
  questions: QuestionItem[];
}

export interface QueryResponse {
  question_key: string;
  answer: string;
  justification_data: Record<string, any>;
  confidence: string;
}

export interface HedgingStrengthResponse {
  score: number;
  classification: "Very Weak" | "Weak" | "Neutral" | "Strong" | "Very Strong";
  net_dex: number;
  net_gex: number;
  factors: Record<string, number>;
  description: string;
}

export interface AnomalyItemOut {
  category: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  score: number;
  description: string;
  impact: string;
}

export interface YieldAnomalyResponse {
  score: number;
  expected_direction: "Bullish" | "Bearish" | "Neutral";
  confidence: "Low" | "Medium" | "High";
  curve_spread_2_10: number;
  credit_spread_ratio: number;
  anomalies: AnomalyItemOut[];
  summary: string;
}

