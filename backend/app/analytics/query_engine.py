from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any
from enum import Enum
from app.analytics.evidence_engine import (
    EvidenceEngine,
    EvidenceCollection,
    EvidenceItem,
    EvidenceType,
    SourceReliability,
    get_evidence_engine
)


class MarketRegime(Enum):
    BULL = "bull"
    BEAR = "bear"
    SIDEWAYS = "sideways"


class VolatilityLevel(Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"


@dataclass
class QuestionTemplate:
    key: str
    label: str
    category: str
    builder_class: type


class ResponseBuilder(ABC):
    """Base class for dynamic response generation with evidence attribution."""
    
    def __init__(self):
        """Initialize ResponseBuilder with evidence engine."""
        self.evidence_engine = get_evidence_engine()
    
    @abstractmethod
    def build_response(self, context: dict[str, Any]) -> dict[str, Any]:
        """Generate response with dynamic content based on context."""
        pass
    
    @abstractmethod
    def get_confidence(self, context: dict[str, Any]) -> str:
        """Calculate confidence level based on data quality."""
        pass
    
    def create_evidence_collection(self, conclusion: str) -> EvidenceCollection:
        """
        Create an evidence collection for the response.
        
        Args:
            conclusion: The conclusion being evaluated
            
        Returns:
            EvidenceCollection object
        """
        return self.evidence_engine.create_evidence_collection(conclusion)
    
    def add_evidence_from_context(
        self,
        collection: EvidenceCollection,
        context: dict[str, Any],
        evidence_mappings: dict[str, dict[str, Any]]
    ) -> None:
        """
        Add evidence items to collection based on context and mappings.
        
        Args:
            collection: EvidenceCollection to add to
            context: Market context dictionary
            evidence_mappings: Mapping of context keys to evidence configuration
                Format: {
                    "context_key": {
                        "source": "Source description",
                        "expected_direction": "positive|negative|neutral",
                        "threshold": optional_float,
                        "confidence": float,
                        "reliability": "high|medium|low|unknown"
                    }
                }
        """
        for key, config in evidence_mappings.items():
            value = context.get(key)
            if value is None:
                # Add missing evidence
                collection.add_evidence(self.evidence_engine.create_evidence_item(
                    evidence_type=EvidenceType.MISSING,
                    source=config["source"],
                    value=None,
                    confidence=config.get("confidence", 0.5),
                    reliability=SourceReliability[config.get("reliability", "MEDIUM").upper()],
                    metadata={"metric": key}
                ))
                continue
            
            # Classify evidence
            evidence_type = self.evidence_engine.classify_evidence(
                value=value,
                expected_direction=config["expected_direction"],
                threshold=config.get("threshold"),
                context=context
            )
            
            # Add evidence item
            collection.add_evidence(self.evidence_engine.create_evidence_item(
                evidence_type=evidence_type,
                source=config["source"],
                value=value,
                confidence=config.get("confidence", 0.8),
                reliability=SourceReliability[config.get("reliability", "MEDIUM").upper()],
                metadata={"metric": key, "threshold": config.get("threshold")}
            ))


class ResponseTemplate:
    """Context-aware response template system."""
    
    @staticmethod
    def get_regime(context: dict[str, Any]) -> MarketRegime:
        """Determine market regime from context."""
        scores = context.get("scores", {})
        
        # Handle both dict and object
        if hasattr(scores, 'bullish_score'):
            bullish = scores.bullish_score
            bearish = scores.bearish_score
        else:
            bullish = scores.get("bullish_score", 0)
            bearish = scores.get("bearish_score", 0)
        
        if bullish > bearish + 15:
            return MarketRegime.BULL
        elif bearish > bullish + 15:
            return MarketRegime.BEAR
        else:
            return MarketRegime.SIDEWAYS
    
    @staticmethod
    def get_volatility_level(context: dict[str, Any]) -> VolatilityLevel:
        """Determine volatility level from context."""
        vol = context.get("vol", {})
        
        # Handle both dict and object
        if hasattr(vol, 'vix_current'):
            vix = vol.vix_current
        else:
            vix = vol.get("vix_current", 15)
        
        if vix < 14:
            return VolatilityLevel.LOW
        elif vix < 20:
            return VolatilityLevel.NORMAL
        else:
            return VolatilityLevel.HIGH
    
    @staticmethod
    def get_regime_context(regime: MarketRegime) -> str:
        """Get contextual description for regime."""
        descriptions = {
            MarketRegime.BULL: "Sesgo alcista confirmado con indicadores estructurales positivos",
            MarketRegime.BEAR: "Sesgo bajista consolidado con presión vendedora",
            MarketRegime.SIDEWAYS: "Mercado en equilibrio sin dirección clara"
        }
        return descriptions.get(regime, "")
    
    @staticmethod
    def get_volatility_context(vol_level: VolatilityLevel) -> str:
        """Get contextual description for volatility level."""
        descriptions = {
            VolatilityLevel.LOW: "volatilidad reducida indica estabilidad",
            VolatilityLevel.NORMAL: "volatilidad en rangos históricos normales",
            VolatilityLevel.HIGH: "volatilidad elevada indica incertidumbre"
        }
        return descriptions.get(vol_level, "")


class QueryEngine:
    _builders: dict[str, ResponseBuilder] = {}
    _templates: list[QuestionTemplate] = []
    
    @classmethod
    def register_builder(cls, template: QuestionTemplate):
        """Register a new question builder."""
        cls._builders[template.key] = template.builder_class()
        cls._templates.append(template)
    
    @classmethod
    def list_supported_questions(cls) -> list[dict[str, str]]:
        """Return list of supported questions."""
        return [
            {
                "key": t.key,
                "label": t.label,
                "category": t.category
            }
            for t in cls._templates
        ]

    @classmethod
    def answer_question(cls, question_key: str, context: dict[str, Any]) -> dict[str, Any]:
        """Answer a question using the registered builder."""
        builder = cls._builders.get(question_key)
        if not builder:
            return {
                "question_key": question_key,
                "answer": "Pregunta no soportada por el motor de inteligencia.",
                "justification_data": {},
                "confidence": "none"
            }
        
        return builder.build_response(context)


class WhyRisingBuilder(ResponseBuilder):
    """Dynamic builder for 'why_rising' question."""
    
    def build_response(self, context: dict[str, Any]) -> dict[str, Any]:
        spot = context.get("spot", 0.0)
        gamma = context.get("gamma")
        delta = context.get("delta")
        options = context.get("options")
        
        if not all([gamma, delta, options]):
            return self._fallback_response(context)
        
        # Create evidence collection
        collection = self.create_evidence_collection("Market is rising")
        
        # Define evidence mappings
        evidence_mappings = {
            "net_gamma_exposure": {
                "source": "Gamma Exposure Calculation",
                "expected_direction": "positive",
                "threshold": 10000000,
                "confidence": 0.9,
                "reliability": "high"
            },
            "net_delta_exposure": {
                "source": "Delta Exposure Calculation", 
                "expected_direction": "positive",
                "threshold": 5000000,
                "confidence": 0.85,
                "reliability": "high"
            },
            "put_call_volume_ratio": {
                "source": "Put/Call Volume Ratio",
                "expected_direction": "negative",
                "threshold": 0.85,
                "confidence": 0.8,
                "reliability": "medium"
            }
        }
        
        # Add context for evidence extraction
        evidence_context = {
            "net_gamma_exposure": gamma.net_gamma_exposure if hasattr(gamma, 'net_gamma_exposure') else 0,
            "net_delta_exposure": delta.net_delta_exposure if hasattr(delta, 'net_delta_exposure') else 0,
            "put_call_volume_ratio": options.put_call_volume_ratio if hasattr(options, 'put_call_volume_ratio') else 1.0
        }
        
        # Add evidence to collection
        self.add_evidence_from_context(collection, evidence_context, evidence_mappings)
        
        factors = self._identify_rising_factors(spot, gamma, delta, options, context)
        answer = self._build_narrative(factors, context)
        
        # Detect conflicts and gaps
        conflicts = self.evidence_engine.detect_conflicts(collection)
        gaps = self.evidence_engine.get_missing_evidence_gaps(collection)
        
        return {
            "question_key": "why_rising",
            "answer": answer,
            "justification_data": self._extract_justification(factors, gamma, delta, options),
            "confidence": self.get_confidence(context),
            "evidence_collection": collection.to_dict(),
            "evidence_summary": collection.get_evidence_summary(),
            "conflicts": conflicts,
            "evidence_gaps": gaps,
            "total_confidence": collection.total_confidence,
            "evidence_quality_score": collection.evidence_quality_score
        }
    
    def _identify_rising_factors(self, spot: float, gamma: Any, delta: Any, options: Any, context: dict[str, Any]) -> list[dict]:
        factors = []
        
        # Get values with fallback to attribute access
        net_gex = getattr(gamma, 'net_gamma_exposure', 0) if gamma else 0
        net_dex = getattr(delta, 'net_delta_exposure', 0) if delta else 0
        pc_ratio = getattr(options, 'put_call_volume_ratio', 1.0) if options else 1.0
        gamma_regime = getattr(gamma, 'regime_type', 'unknown') if gamma else 'unknown'
        delta_regime = getattr(delta, 'regime_type', 'unknown') if delta else 'unknown'
        options_regime = getattr(options, 'regime_type', 'unknown') if options else 'unknown'
        
        if gamma_regime == "positive":
            factors.append({
                "type": "gamma_regime",
                "weight": 0.4,
                "description": f"Régimen Gamma Positiva con Net GEX de ${net_gex:,.0f}",
                "impact": "high"
            })
        
        if delta_regime == "call_dominated" or options_regime == "call_dominated":
            factors.append({
                "type": "delta_flow",
                "weight": 0.3,
                "description": f"Flujo Delta positivo de ${net_dex:,.0f}",
                "impact": "high"
            })
        
        if pc_ratio < 0.85:
            factors.append({
                "type": "volume_sentiment",
                "weight": 0.2,
                "description": f"Put/Call Volume Ratio bajo ({pc_ratio:.2f})",
                "impact": "medium"
            })
        
        max_pain = context.get("max_pain", 0.0)
        if spot > max_pain:
            distance_pct = ((spot - max_pain) / spot) * 100
            factors.append({
                "type": "max_pain_position",
                "weight": 0.1,
                "description": f"Precio {distance_pct:.1f}% sobre Max Pain",
                "impact": "low"
            })
        
        return sorted(factors, key=lambda x: x["weight"], reverse=True)
    
    def _build_narrative(self, factors: list[dict], context: dict[str, Any]) -> str:
        if not factors:
            return "La estructura de opciones no muestra un sesgo alcista claro. El movimiento podría estar impulsado por flujos fuera de opciones."
        
        regime = ResponseTemplate.get_regime(context)
        vol_level = ResponseTemplate.get_volatility_level(context)
        
        narrative = "La subida del precio está respaldada por:\n\n"
        for factor in factors:
            narrative += f"- **{factor['type'].replace('_', ' ').title()}**: {factor['description']}\n"
        
        # Add regime context
        if regime != MarketRegime.SIDEWAYS:
            narrative += f"\n**Contexto de Mercado:** {ResponseTemplate.get_regime_context(regime)}."
        
        # Add volatility context if relevant
        if vol_level != VolatilityLevel.NORMAL:
            narrative += f" {ResponseTemplate.get_volatility_context(vol_level)}."
        
        if len(factors) >= 2:
            narrative += f"\nLa confluencia de {len(factors)} factores indica un sesgo alcista estructural."
        
        return narrative
    
    def _extract_justification(self, factors: list[dict], gamma: Any, delta: Any, options: Any) -> dict[str, Any]:
        return {
            "primary_factors": [f["type"] for f in factors[:3]],
            "factor_weights": {f["type"]: f["weight"] for f in factors},
            "total_weight": sum(f["weight"] for f in factors),
            "net_gex": getattr(gamma, 'net_gamma_exposure', 0) if gamma else 0,
            "net_dex": getattr(delta, 'net_delta_exposure', 0) if delta else 0,
            "put_call_volume_ratio": getattr(options, 'put_call_volume_ratio', 1.0) if options else 1.0
        }
    
    def _fallback_response(self, context: dict[str, Any]) -> dict[str, Any]:
        # Create evidence collection for insufficient data case
        collection = self.create_evidence_collection("Insufficient data for analysis")
        
        # Add missing evidence items
        missing_evidence = [
            ("gamma", "Gamma Analysis"),
            ("delta", "Delta Analysis"), 
            ("options", "Options Flow Analysis")
        ]
        
        for key, source in missing_evidence:
            if context.get(key) is None:
                collection.add_evidence(self.evidence_engine.create_evidence_item(
                    evidence_type=EvidenceType.MISSING,
                    source=source,
                    value=None,
                    confidence=0.0,
                    reliability=SourceReliability.UNKNOWN,
                    metadata={"metric": key, "reason": "insufficient_data"}
                ))
        
        return {
            "question_key": "why_rising",
            "answer": "Datos insuficientes para analizar la subida del precio.",
            "justification_data": {},
            "confidence": "low",
            "evidence_collection": collection.to_dict(),
            "evidence_summary": collection.get_evidence_summary(),
            "conflicts": [],
            "evidence_gaps": self.evidence_engine.get_missing_evidence_gaps(collection),
            "total_confidence": collection.total_confidence,
            "evidence_quality_score": collection.evidence_quality_score
        }
    
    def get_confidence(self, context: dict[str, Any]) -> str:
        confidence_score = 0.0
        if context.get("gamma") and context.get("delta"):
            confidence_score += 0.4
        if context.get("options"):
            confidence_score += 0.3
        if context.get("vol"):
            confidence_score += 0.3
        
        if confidence_score >= 0.8:
            return "high"
        elif confidence_score >= 0.5:
            return "medium"
        else:
            return "low"


class WhyFallingFastBuilder(ResponseBuilder):
    """Dynamic builder for 'why_falling_fast' question."""
    
    def build_response(self, context: dict[str, Any]) -> dict[str, Any]:
        spot = context.get("spot", 0.0)
        gamma = context.get("gamma")
        delta = context.get("delta")
        options = context.get("options")
        vol = context.get("vol")
        
        if not all([gamma, delta, options, vol]):
            return self._fallback_response(context)
        
        # Create evidence collection
        collection = self.create_evidence_collection("Market is falling fast")
        
        # Define evidence mappings for falling market
        evidence_mappings = {
            "net_gamma_exposure": {
                "source": "Gamma Exposure Calculation",
                "expected_direction": "negative",
                "threshold": -10000000,
                "confidence": 0.9,
                "reliability": "high"
            },
            "net_delta_exposure": {
                "source": "Delta Exposure Calculation",
                "expected_direction": "negative", 
                "threshold": -5000000,
                "confidence": 0.85,
                "reliability": "high"
            },
            "vix_current": {
                "source": "VIX Index",
                "expected_direction": "positive",
                "threshold": 18.0,
                "confidence": 0.95,
                "reliability": "high"
            }
        }
        
        # Add context for evidence extraction
        evidence_context = {
            "net_gamma_exposure": getattr(gamma, 'net_gamma_exposure', 0) if gamma else 0,
            "net_delta_exposure": getattr(delta, 'net_delta_exposure', 0) if delta else 0,
            "vix_current": getattr(vol, 'vix_current', 15) if vol else 15
        }
        
        # Add evidence to collection
        self.add_evidence_from_context(collection, evidence_context, evidence_mappings)
        
        factors = self._identify_falling_factors(spot, gamma, delta, options, vol)
        answer = self._build_narrative(factors, context)
        
        # Detect conflicts and gaps
        conflicts = self.evidence_engine.detect_conflicts(collection)
        gaps = self.evidence_engine.get_missing_evidence_gaps(collection)
        
        return {
            "question_key": "why_falling_fast",
            "answer": answer,
            "justification_data": self._extract_justification(factors, gamma, delta, vol, spot),
            "confidence": self.get_confidence(context),
            "evidence_collection": collection.to_dict(),
            "evidence_summary": collection.get_evidence_summary(),
            "conflicts": conflicts,
            "evidence_gaps": gaps,
            "total_confidence": collection.total_confidence,
            "evidence_quality_score": collection.evidence_quality_score
        }
    
    def _identify_falling_factors(self, spot: float, gamma: Any, delta: Any, options: Any, vol: Any) -> list[dict]:
        factors = []
        
        gamma_regime = getattr(gamma, 'regime_type', 'unknown') if gamma else 'unknown'
        net_gex = getattr(gamma, 'net_gamma_exposure', 0) if gamma else 0
        net_dex = getattr(delta, 'net_delta_exposure', 0) if delta else 0
        vix_current = getattr(vol, 'vix_current', 15) if vol else 15
        
        if gamma_regime == "negative":
            factors.append({
                "type": "gamma_regime",
                "weight": 0.4,
                "description": f"Régimen Gamma Negativa con Net GEX de ${net_gex:,.0f}",
                "impact": "high"
            })
        
        delta_regime = getattr(delta, 'regime_type', 'unknown') if delta else 'unknown'
        options_regime = getattr(options, 'regime_type', 'unknown') if options else 'unknown'
        put_wall = getattr(gamma, 'put_wall', None) if gamma else None
        
        if delta_regime == "put_dominated" or options_regime == "put_dominated":
            factors.append({
                "type": "delta_flow",
                "weight": 0.3,
                "description": f"Dominancia de Puts con Net DEX de ${net_dex:,.0f}",
                "impact": "high"
            })
        
        if vix_current > 18.0:
            factors.append({
                "type": "volatility",
                "weight": 0.2,
                "description": f"VIX elevado ({vix_current:.2f}) expandiendo rangos de caída",
                "impact": "medium"
            })
        
        if put_wall and spot < put_wall:
            factors.append({
                "type": "support_breach",
                "weight": 0.1,
                "description": f"Precio penetró Put Wall (${put_wall:.2f})",
                "impact": "low"
            })
        
        return sorted(factors, key=lambda x: x["weight"], reverse=True)
    
    def _build_narrative(self, factors: list[dict], context: dict[str, Any]) -> str:
        if not factors:
            return "La estructura de opciones no presenta un sesgo bajista extremo consolidado."
        
        regime = ResponseTemplate.get_regime(context)
        vol_level = ResponseTemplate.get_volatility_level(context)
        
        narrative = "La aceleración de las caídas se justifica por:\n\n"
        for factor in factors:
            narrative += f"- **{factor['type'].replace('_', ' ').title()}**: {factor['description']}\n"
        
        # Add regime context
        if regime == MarketRegime.BEAR:
            narrative += f"\n**Contexto de Mercado:** {ResponseTemplate.get_regime_context(regime)}."
        
        # Add volatility context if high
        if vol_level == VolatilityLevel.HIGH:
            narrative += f" {ResponseTemplate.get_volatility_context(vol_level)}."
        
        return narrative
    
    def _extract_justification(self, factors: list[dict], gamma: Any, delta: Any, vol: Any, spot: float) -> dict[str, Any]:
        return {
            "primary_factors": [f["type"] for f in factors[:3]],
            "net_gex": gamma.net_gamma_exposure,
            "net_dex": delta.net_delta_exposure,
            "vix": vol.vix_current,
            "spot_vs_put_wall": spot - (gamma.put_wall or 0) if gamma else 0
        }
    
    def _fallback_response(self, context: dict[str, Any]) -> dict[str, Any]:
        return {
            "question_key": "why_falling_fast",
            "answer": "Datos insuficientes para analizar la caída del precio.",
            "justification_data": {},
            "confidence": "low"
        }
    
    def get_confidence(self, context: dict[str, Any]) -> str:
        confidence_score = 0.0
        if context.get("gamma") and context.get("delta"):
            confidence_score += 0.4
        if context.get("options"):
            confidence_score += 0.3
        if context.get("vol"):
            confidence_score += 0.3
        
        return "high" if confidence_score >= 0.8 else "medium" if confidence_score >= 0.5 else "low"


class WhySidewaysBuilder(ResponseBuilder):
    """Dynamic builder for 'why_sideways' question."""
    
    def build_response(self, context: dict[str, Any]) -> dict[str, Any]:
        spot = context.get("spot", 0.0)
        gamma = context.get("gamma")
        vol = context.get("vol")
        
        if not all([gamma, vol]):
            return self._fallback_response(context)
        
        factors = self._identify_sideways_factors(spot, gamma, vol, context)
        answer = self._build_narrative(factors)
        
        return {
            "question_key": "why_sideways",
            "answer": answer,
            "justification_data": self._extract_justification(factors, gamma, vol, context),
            "confidence": self.get_confidence(context)
        }
    
    def _identify_sideways_factors(self, spot: float, gamma: Any, vol: Any, context: dict[str, Any]) -> list[dict]:
        factors = []
        
        if gamma.regime_type == "positive":
            factors.append({
                "type": "gamma_stabilization",
                "weight": 0.4,
                "description": f"Régimen Gamma Positiva (Net GEX: ${gamma.net_gamma_exposure:,.0f}) estabiliza precio",
                "impact": "high"
            })
        
        max_pain = context.get("max_pain", 0.0)
        if max_pain > 0 and abs(spot - max_pain) / spot <= 0.0075:
            factors.append({
                "type": "max_pain_anchor",
                "weight": 0.3,
                "description": f"Precio cerca de Max Pain (${max_pain:.2f}) con efecto magneto",
                "impact": "high"
            })
        
        if vol.vix_current < 14.0:
            factors.append({
                "type": "low_volatility",
                "weight": 0.3,
                "description": f"VIX bajo ({vol.vix_current:.2f}) reduce amplitud operativa",
                "impact": "medium"
            })
        
        return sorted(factors, key=lambda x: x["weight"], reverse=True)
    
    def _build_narrative(self, factors: list[dict]) -> str:
        if not factors:
            return "Los niveles estructurales no muestran un anclaje extremo directo."
        
        narrative = "El comportamiento lateral se debe a:\n\n"
        for factor in factors:
            narrative += f"- **{factor['type'].replace('_', ' ').title()}**: {factor['description']}\n"
        
        return narrative
    
    def _extract_justification(self, factors: list[dict], gamma: Any, vol: Any, context: dict[str, Any]) -> dict[str, Any]:
        return {
            "primary_factors": [f["type"] for f in factors[:3]],
            "net_gex": gamma.net_gamma_exposure,
            "vix": vol.vix_current,
            "spot_vs_max_pain": context.get("spot", 0) - context.get("max_pain", 0)
        }
    
    def _fallback_response(self, context: dict[str, Any]) -> dict[str, Any]:
        return {
            "question_key": "why_sideways",
            "answer": "Datos insuficientes para analizar el comportamiento lateral.",
            "justification_data": {},
            "confidence": "low"
        }
    
    def get_confidence(self, context: dict[str, Any]) -> str:
        confidence_score = 0.0
        if context.get("gamma"):
            confidence_score += 0.5
        if context.get("vol"):
            confidence_score += 0.5
        
        return "high" if confidence_score >= 0.8 else "medium" if confidence_score >= 0.5 else "low"


class WhyVolIncreasingBuilder(ResponseBuilder):
    """Dynamic builder for 'why_vol_increasing' question."""
    
    def build_response(self, context: dict[str, Any]) -> dict[str, Any]:
        gamma = context.get("gamma")
        vol = context.get("vol")
        options = context.get("options")
        
        if not all([gamma, vol, options]):
            return self._fallback_response(context)
        
        factors = self._identify_vol_factors(gamma, vol, options)
        answer = self._build_narrative(factors)
        
        return {
            "question_key": "why_vol_increasing",
            "answer": answer,
            "justification_data": self._extract_justification(factors, vol, options),
            "confidence": self.get_confidence(context)
        }
    
    def _identify_vol_factors(self, gamma: Any, vol: Any, options: Any) -> list[dict]:
        factors = []
        
        if gamma.regime_type == "negative":
            factors.append({
                "type": "gamma_regime",
                "weight": 0.4,
                "description": f"Régimen Gamma Negativa persigue volatilidad del precio",
                "impact": "high"
            })
        
        if vol.vix_current > vol.historical_vix_min * 1.5:
            factors.append({
                "type": "vix_elevation",
                "weight": 0.3,
                "description": f"VIX en {vol.vix_current:.2f} con skew elevado",
                "impact": "high"
            })
        
        if options.put_call_volume_ratio > 1.25:
            factors.append({
                "type": "put_flow",
                "weight": 0.3,
                "description": f"Alto Put/Call Volume Ratio ({options.put_call_volume_ratio:.2f})",
                "impact": "medium"
            })
        
        return sorted(factors, key=lambda x: x["weight"], reverse=True)
    
    def _build_narrative(self, factors: list[dict]) -> str:
        if not factors:
            return "Los datos no muestran un aumento drástico en volatilidad."
        
        narrative = "El aumento de volatilidad se justifica por:\n\n"
        for factor in factors:
            narrative += f"- **{factor['type'].replace('_', ' ').title()}**: {factor['description']}\n"
        
        return narrative
    
    def _extract_justification(self, factors: list[dict], vol: Any, options: Any) -> dict[str, Any]:
        return {
            "primary_factors": [f["type"] for f in factors[:3]],
            "vix": vol.vix_current,
            "vix_percentile": vol.vix_percentile,
            "put_call_volume_ratio": options.put_call_volume_ratio
        }
    
    def _fallback_response(self, context: dict[str, Any]) -> dict[str, Any]:
        return {
            "question_key": "why_vol_increasing",
            "answer": "Datos insuficientes para analizar el aumento de volatilidad.",
            "justification_data": {},
            "confidence": "low"
        }
    
    def get_confidence(self, context: dict[str, Any]) -> str:
        confidence_score = 0.0
        if context.get("gamma"):
            confidence_score += 0.3
        if context.get("vol"):
            confidence_score += 0.4
        if context.get("options"):
            confidence_score += 0.3
        
        return "high" if confidence_score >= 0.8 else "medium" if confidence_score >= 0.5 else "low"


class WhatDealersDoingBuilder(ResponseBuilder):
    """Dynamic builder for 'what_dealers_doing' question."""
    
    def build_response(self, context: dict[str, Any]) -> dict[str, Any]:
        dealer = context.get("dealer")
        
        if not dealer:
            return self._fallback_response(context)
        
        answer = self._build_narrative(dealer)
        
        return {
            "question_key": "what_dealers_doing",
            "answer": answer,
            "justification_data": self._extract_justification(dealer),
            "confidence": self.get_confidence(context)
        }
    
    def _build_narrative(self, dealer: Any) -> str:
        style = "cobertura pasiva estabilizadora (comprar bajo, vender alto)" if dealer.hedging_style == "mean_reversion" else "cobertura activa pro-cíclica (vender caídas, comprar subidas)"
        
        narrative = (
            f"De acuerdo con el posicionamiento neto estimado, los Dealers se encuentran en régimen de **{dealer.dealer_gamma_regime.upper()}**.\n\n"
            f"- **Acción de Cobertura:** Actualmente están realizando {style}.\n"
            f"- **Lado del Flujo:** Al estar expuestos a un Net Gamma neto de ${dealer.net_gamma_exposure:,.2f}, si el precio del SPY sube, los dealers "
            f"{'venden acciones/futuros para recolectar ganancias de delta' if dealer.dealer_gamma_regime == 'long_gamma' else 'compran subyacente para evitar pérdidas de gamma corto'}. "
            f"Si el precio baja, {'compran subyacente para cubrir deltas' if dealer.dealer_gamma_regime == 'long_gamma' else 'venden subyacente de forma agresiva para rebalancear su exposición'}.\n"
            f"- **Presión de Delta:** El delta exposure de los Dealers se estima en ${dealer.net_delta_exposure:,.2f}."
        )
        return narrative
    
    def _extract_justification(self, dealer: Any) -> dict[str, Any]:
        return {
            "dealer_gamma_regime": dealer.dealer_gamma_regime,
            "dealer_delta_regime": dealer.dealer_delta_regime,
            "net_gex": dealer.net_gamma_exposure,
            "net_dex": dealer.net_delta_exposure
        }
    
    def _fallback_response(self, context: dict[str, Any]) -> dict[str, Any]:
        return {
            "question_key": "what_dealers_doing",
            "answer": "Datos insuficientes para analizar el comportamiento de dealers.",
            "justification_data": {},
            "confidence": "low"
        }
    
    def get_confidence(self, context: dict[str, Any]) -> str:
        return "high" if context.get("dealer") else "low"


class WhatOptionsIndicateBuilder(ResponseBuilder):
    """Dynamic builder for 'what_options_indicate' question."""
    
    def build_response(self, context: dict[str, Any]) -> dict[str, Any]:
        options = context.get("options")
        gamma = context.get("gamma")
        vol = context.get("vol")
        
        if not all([options, gamma, vol]):
            return self._fallback_response(context)
        
        answer = self._build_narrative(options, gamma, vol)
        
        return {
            "question_key": "what_options_indicate",
            "answer": answer,
            "justification_data": self._extract_justification(options, vol, gamma),
            "confidence": self.get_confidence(context)
        }
    
    def _build_narrative(self, options: Any, gamma: Any, vol: Any) -> str:
        narrative = (
            f"El análisis de la cadena completa de opciones indica un sentimiento **{options.regime_type.upper()}** general:\n\n"
            f"- **Ratio de Interés Abierto:** El Put/Call OI Ratio es de **{options.put_call_oi_ratio:.2f}**, lo que refleja {options.sentiment_description.split('.')[0].lower()}.\n"
            f"- **Flujo Intradía:** El Put/Call Volume Ratio está en **{options.put_call_volume_ratio:.2f}**, señalando la dirección de los flujos de dinero del día.\n"
            f"- **Expected Move:** La estructura de precios de opciones de corto plazo delimita una fluctuación esperada de **+/- ${vol.expected_move_used:.2f}** para este vencimiento, "
            f"estableciendo los límites teóricos del día en **${vol.lower_bound:.2f}** a la baja y **${vol.upper_bound:.2f}** al alza.\n"
            f"- **Zonas de Absorción:** Las mayores concentraciones se encuentran en el Call Wall (${gamma.call_wall:.2f}) y el Put Wall (${gamma.put_wall:.2f})."
        )
        return narrative
    
    def _extract_justification(self, options: Any, vol: Any, gamma: Any) -> dict[str, Any]:
        return {
            "put_call_oi": options.put_call_oi_ratio,
            "put_call_volume": options.put_call_volume_ratio,
            "expected_move": vol.expected_move_used,
            "high_liquidity_strikes": options.high_liquidity_strikes
        }
    
    def _fallback_response(self, context: dict[str, Any]) -> dict[str, Any]:
        return {
            "question_key": "what_options_indicate",
            "answer": "Datos insuficientes para analizar el sentimiento de opciones.",
            "justification_data": {},
            "confidence": "low"
        }
    
    def get_confidence(self, context: dict[str, Any]) -> str:
        confidence_score = 0.0
        if context.get("options"):
            confidence_score += 0.4
        if context.get("gamma"):
            confidence_score += 0.3
        if context.get("vol"):
            confidence_score += 0.3
        
        return "high" if confidence_score >= 0.8 else "medium" if confidence_score >= 0.5 else "low"


# Register default builders
QueryEngine.register_builder(QuestionTemplate(
    key="why_rising",
    label="¿Por qué el precio está subiendo?",
    category="Dirección",
    builder_class=WhyRisingBuilder
))

QueryEngine.register_builder(QuestionTemplate(
    key="why_falling_fast",
    label="¿Por qué cayó tan rápido?",
    category="Dirección",
    builder_class=WhyFallingFastBuilder
))

QueryEngine.register_builder(QuestionTemplate(
    key="why_sideways",
    label="¿Por qué el mercado está lateral?",
    category="Dirección",
    builder_class=WhySidewaysBuilder
))

QueryEngine.register_builder(QuestionTemplate(
    key="why_vol_increasing",
    label="¿Por qué aumentó la volatilidad?",
    category="Volatilidad",
    builder_class=WhyVolIncreasingBuilder
))

QueryEngine.register_builder(QuestionTemplate(
    key="what_dealers_doing",
    label="¿Qué están haciendo los dealers?",
    category="Microestructura",
    builder_class=WhatDealersDoingBuilder
))

QueryEngine.register_builder(QuestionTemplate(
    key="what_options_indicate",
    label="¿Qué indican las opciones?",
    category="Microestructura",
    builder_class=WhatOptionsIndicateBuilder
))
