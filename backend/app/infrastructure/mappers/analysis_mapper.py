from datetime import date
from typing import Any, Dict

from app.domain.model.analysis import (
    GammaAnalysis,
    DeltaAnalysis,
    OptionsAnalysis,
    VolatilityAnalysis,
    DealerAnalysis,
    DeltaHedgingStrength,
    ComprehensiveAnalysis,
    AnalysisScores,
    AnalysisConfidence,
    MarketRegime,
    MarketScenario,
)


class AnalysisMapper:
    """Mapper for converting between domain analysis models and DTOs."""
    
    @staticmethod
    def gamma_analysis_to_dict(gamma: GammaAnalysis) -> Dict[str, Any]:
        """Convert GammaAnalysis domain model to dictionary."""
        return {
            "net_gamma_exposure": gamma.net_gamma_exposure,
            "call_wall": gamma.call_wall,
            "put_wall": gamma.put_wall,
            "gamma_wall": gamma.gamma_wall,
            "zero_gamma": gamma.zero_gamma,
            "gamma_flip_distance_pct": gamma.gamma_flip_distance_pct,
            "is_gamma_flip_close": gamma.is_gamma_flip_close,
            "regime_type": gamma.regime_type,
            "description": gamma.description,
            "risks": gamma.risks,
            "expected_behavior": gamma.expected_behavior,
        }
    
    @staticmethod
    def delta_analysis_to_dict(delta: DeltaAnalysis) -> Dict[str, Any]:
        """Convert DeltaAnalysis domain model to dictionary."""
        return {
            "net_delta_exposure": delta.net_delta_exposure,
            "call_dex_wall": delta.call_dex_wall,
            "put_dex_wall": delta.put_dex_wall,
            "regime_type": delta.regime_type,
            "description": delta.description,
            "hedging_pressure": delta.hedging_pressure,
        }
    
    @staticmethod
    def options_analysis_to_dict(options: OptionsAnalysis) -> Dict[str, Any]:
        """Convert OptionsAnalysis domain model to dictionary."""
        return {
            "put_call_oi_ratio": options.put_call_oi_ratio,
            "put_call_volume_ratio": options.put_call_volume_ratio,
            "high_liquidity_strikes": options.high_liquidity_strikes,
            "regime_type": options.regime_type,
            "sentiment_description": options.sentiment_description,
            "liquidity_zones": options.liquidity_zones,
        }
    
    @staticmethod
    def volatility_analysis_to_dict(vol: VolatilityAnalysis) -> Dict[str, Any]:
        """Convert VolatilityAnalysis domain model to dictionary."""
        return {
            "vix_current": vol.vix_current,
            "vix_rank": vol.vix_rank,
            "vix_percentile": vol.vix_percentile,
            "atm_iv": vol.atm_iv,
            "expected_move_iv": vol.expected_move_iv,
            "expected_move_straddle": vol.expected_move_straddle,
            "expected_move_used": vol.expected_move_used,
            "lower_bound": vol.lower_bound,
            "upper_bound": vol.upper_bound,
            "regime_type": vol.regime_type,
            "description": vol.description,
            "historico_vix_min": vol.historical_vix_min,
            "historico_vix_max": vol.historical_vix_max,
        }
    
    @staticmethod
    def dealer_analysis_to_dict(dealer: DealerAnalysis) -> Dict[str, Any]:
        """Convert DealerAnalysis domain model to dictionary."""
        return {
            "net_gamma_exposure": dealer.net_gamma_exposure,
            "net_delta_exposure": dealer.net_delta_exposure,
            "dealer_gamma_regime": dealer.dealer_gamma_regime,
            "dealer_delta_regime": dealer.dealer_delta_regime,
            "hedging_style": dealer.hedging_style,
            "description": dealer.description,
            "hedging_impact": dealer.hedging_impact,
        }
    
    @staticmethod
    def hedging_strength_to_dict(strength: DeltaHedgingStrength) -> Dict[str, Any]:
        """Convert DeltaHedgingStrength domain model to dictionary."""
        return {
            "score": strength.score,
            "classification": strength.classification,
            "net_dex": strength.net_dex,
            "net_gex": strength.net_gex,
            "factors": strength.factors,
            "description": strength.description,
        }
    
    @staticmethod
    def comprehensive_analysis_to_dict(analysis: ComprehensiveAnalysis) -> Dict[str, Any]:
        """Convert ComprehensiveAnalysis domain model to dictionary."""
        return {
            "ticker": analysis.ticker,
            "expiration": analysis.expiration,
            "spot_price": analysis.spot_price,
            "gamma_analysis": AnalysisMapper.gamma_analysis_to_dict(analysis.gamma),
            "delta_analysis": AnalysisMapper.delta_analysis_to_dict(analysis.delta),
            "options_analysis": AnalysisMapper.options_analysis_to_dict(analysis.options),
            "volatility_analysis": AnalysisMapper.volatility_analysis_to_dict(analysis.volatility),
            "dealer_analysis": AnalysisMapper.dealer_analysis_to_dict(analysis.dealer),
            "hedging_strength": AnalysisMapper.hedging_strength_to_dict(analysis.hedging_strength) if analysis.hedging_strength else None,
            "yield_anomaly": None,  # TODO: Add yield anomaly mapping if needed
            "scores": {
                "bullish_score": analysis.scores.bullish_score,
                "bearish_score": analysis.scores.bearish_score,
                "neutral_score": analysis.scores.neutral_score,
                "overall_sentiment": analysis.scores.overall_sentiment,
            },
            "confidence": {
                "overall_confidence": analysis.confidence.overall_confidence,
                "data_quality_score": analysis.confidence.data_quality_score,
                "model_confidence": analysis.confidence.model_confidence,
                "factors": analysis.confidence.factors,
            },
            "regime": {
                "gamma_regime": analysis.regime.gamma_regime,
                "delta_regime": analysis.regime.delta_regime,
                "volatility_regime": analysis.regime.volatility_regime,
                "options_regime": analysis.regime.options_regime,
                "overall_regime": analysis.regime.overall_regime,
                "description": analysis.regime.description,
            },
            "scenarios": [
                {
                    "scenario_type": s.scenario_type,
                    "probability": s.probability,
                    "price_target": s.price_target,
                    "description": s.description,
                    "key_drivers": s.key_drivers,
                }
                for s in analysis.scenarios
            ],
            "max_pain": analysis.max_pain,
            "fetched_at": analysis.fetched_at,
        }
