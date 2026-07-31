"""
Evidence-Based Reasoning Engine

This module implements the evidence attribution pattern for all intelligence outputs.
It provides structured evidence classification, confidence-weighted scoring, and
automatic identification of supporting, contradicting, and missing evidence.

The engine follows domain-driven design principles and clean architecture patterns
to ensure maintainability and extensibility.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


class EvidenceType(Enum):
    """Classification of evidence types for structured analysis."""
    SUPPORTING = "supporting"
    CONTRADICTING = "contradicting"
    MISSING = "missing"
    NEUTRAL = "neutral"


class SourceReliability(Enum):
    """Reliability levels for evidence sources."""
    HIGH = "high"  # Institutional data, direct market feeds
    MEDIUM = "medium"  # Public data, calculated metrics
    LOW = "low"  # Derived indicators, estimates
    UNKNOWN = "unknown"  # Unverified sources


@dataclass
class EvidenceItem:
    """
    Individual evidence item with metadata and confidence scoring.
    
    Attributes:
        type: Classification of evidence (supporting/contradicting/missing)
        source: Description of the evidence source
        value: Numerical or categorical value of the evidence
        confidence: Confidence score (0.0 to 1.0)
        reliability: Source reliability level
        timestamp: When the evidence was generated
        metadata: Additional context about the evidence
        weight: Calculated weight based on confidence and reliability
    """
    type: EvidenceType
    source: str
    value: Any
    confidence: float
    reliability: SourceReliability
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    weight: float = field(init=False)
    
    def __post_init__(self):
        """Calculate weight based on confidence and reliability."""
        reliability_multiplier = {
            SourceReliability.HIGH: 1.0,
            SourceReliability.MEDIUM: 0.75,
            SourceReliability.LOW: 0.5,
            SourceReliability.UNKNOWN: 0.25
        }
        self.weight = self.confidence * reliability_multiplier[self.reliability]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert evidence item to dictionary for serialization."""
        return {
            "type": self.type.value,
            "source": self.source,
            "value": self.value,
            "confidence": self.confidence,
            "reliability": self.reliability.value,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata,
            "weight": self.weight
        }


@dataclass
class EvidenceCollection:
    """
    Collection of evidence items with aggregate statistics.
    
    Attributes:
        conclusion: The main conclusion or assertion being evaluated
        supporting_evidence: List of supporting evidence items
        contradicting_evidence: List of contradicting evidence items
        missing_evidence: List of missing evidence items
        neutral_evidence: List of neutral evidence items
        total_confidence: Aggregate confidence score
        evidence_quality_score: Overall quality assessment
        generated_at: Timestamp of evidence collection
    """
    conclusion: str
    supporting_evidence: List[EvidenceItem] = field(default_factory=list)
    contradicting_evidence: List[EvidenceItem] = field(default_factory=list)
    missing_evidence: List[EvidenceItem] = field(default_factory=list)
    neutral_evidence: List[EvidenceItem] = field(default_factory=list)
    total_confidence: float = field(init=False)
    evidence_quality_score: float = field(init=False)
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def __post_init__(self):
        """Calculate aggregate confidence and quality scores."""
        self.total_confidence = self._calculate_total_confidence()
        self.evidence_quality_score = self._calculate_quality_score()
    
    def _calculate_total_confidence(self) -> float:
        """
        Calculate total confidence based on evidence balance.
        
        Returns:
            Confidence score between 0.0 and 1.0
        """
        if not self.supporting_evidence and not self.contradicting_evidence:
            return 0.0
        
        supporting_weight = sum(item.weight for item in self.supporting_evidence)
        contradicting_weight = sum(item.weight for item in self.contradicting_evidence)
        total_weight = supporting_weight + contradicting_weight
        
        if total_weight == 0:
            return 0.0
        
        # Calculate net confidence
        net_confidence = (supporting_weight - contradicting_weight) / total_weight
        
        # Normalize to 0-1 range
        return (net_confidence + 1) / 2
    
    def _calculate_quality_score(self) -> float:
        """
        Calculate evidence quality score based on completeness and reliability.
        
        Returns:
            Quality score between 0.0 and 1.0
        """
        total_evidence = (
            len(self.supporting_evidence) + 
            len(self.contradicting_evidence) + 
            len(self.neutral_evidence)
        )
        
        if total_evidence == 0:
            return 0.0
        
        # Calculate average reliability
        all_evidence = (
            self.supporting_evidence + 
            self.contradicting_evidence + 
            self.neutral_evidence
        )
        
        reliability_scores = {
            SourceReliability.HIGH: 1.0,
            SourceReliability.MEDIUM: 0.75,
            SourceReliability.LOW: 0.5,
            SourceReliability.UNKNOWN: 0.25
        }
        
        avg_reliability = sum(
            reliability_scores[item.reliability] for item in all_evidence
        ) / total_evidence
        
        # Penalty for missing evidence
        missing_penalty = len(self.missing_evidence) * 0.1
        
        quality_score = avg_reliability - missing_penalty
        return max(0.0, min(1.0, quality_score))
    
    def add_evidence(self, evidence: EvidenceItem) -> None:
        """
        Add evidence item to the appropriate collection.
        
        Args:
            evidence: EvidenceItem to add
        """
        if evidence.type == EvidenceType.SUPPORTING:
            self.supporting_evidence.append(evidence)
        elif evidence.type == EvidenceType.CONTRADICTING:
            self.contradicting_evidence.append(evidence)
        elif evidence.type == EvidenceType.MISSING:
            self.missing_evidence.append(evidence)
        elif evidence.type == EvidenceType.NEUTRAL:
            self.neutral_evidence.append(evidence)
        
        # Recalculate scores
        self.total_confidence = self._calculate_total_confidence()
        self.evidence_quality_score = self._calculate_quality_score()
    
    def get_evidence_summary(self) -> Dict[str, Any]:
        """
        Get summary statistics of the evidence collection.
        
        Returns:
            Dictionary with evidence statistics
        """
        return {
            "conclusion": self.conclusion,
            "supporting_count": len(self.supporting_evidence),
            "contradicting_count": len(self.contradicting_evidence),
            "missing_count": len(self.missing_evidence),
            "neutral_count": len(self.neutral_evidence),
            "total_confidence": self.total_confidence,
            "evidence_quality_score": self.evidence_quality_score,
            "supporting_weight": sum(item.weight for item in self.supporting_evidence),
            "contradicting_weight": sum(item.weight for item in self.contradicting_evidence),
            "generated_at": self.generated_at.isoformat()
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert evidence collection to dictionary for serialization.
        
        Returns:
            Dictionary representation of the evidence collection
        """
        return {
            "conclusion": self.conclusion,
            "supporting_evidence": [item.to_dict() for item in self.supporting_evidence],
            "contradicting_evidence": [item.to_dict() for item in self.contradicting_evidence],
            "missing_evidence": [item.to_dict() for item in self.missing_evidence],
            "neutral_evidence": [item.to_dict() for item in self.neutral_evidence],
            "summary": self.get_evidence_summary()
        }


class EvidenceEngine:
    """
    Main engine for evidence-based reasoning and attribution.
    
    This class provides methods to create evidence collections, classify evidence,
    and generate evidence-backed conclusions for intelligence outputs.
    """
    
    def __init__(self):
        """Initialize the EvidenceEngine with default configuration."""
        self._evidence_collections: Dict[str, EvidenceCollection] = {}
        logger.info("EvidenceEngine initialized")
    
    def create_evidence_collection(self, conclusion: str) -> EvidenceCollection:
        """
        Create a new evidence collection for a given conclusion.
        
        Args:
            conclusion: The conclusion or assertion to evaluate
            
        Returns:
            EvidenceCollection object
        """
        collection = EvidenceCollection(conclusion=conclusion)
        self._evidence_collections[conclusion] = collection
        logger.debug(f"Created evidence collection for: {conclusion}")
        return collection
    
    def classify_evidence(
        self,
        value: Any,
        expected_direction: str,
        threshold: Optional[float] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> EvidenceType:
        """
        Classify evidence based on value, expected direction, and threshold.
        
        Args:
            value: The observed value
            expected_direction: Expected direction ("positive", "negative", "neutral")
            threshold: Optional threshold for classification
            context: Additional context for classification
            
        Returns:
            EvidenceType classification
        """
        if value is None:
            return EvidenceType.MISSING
        
        # Handle zero values as neutral
        if isinstance(value, (int, float)) and value == 0:
            return EvidenceType.NEUTRAL
        
        if threshold is None:
            # Simple classification based on sign
            if expected_direction == "positive":
                return EvidenceType.SUPPORTING if value > 0 else EvidenceType.CONTRADICTING
            elif expected_direction == "negative":
                return EvidenceType.SUPPORTING if value < 0 else EvidenceType.CONTRADICTING
            else:
                return EvidenceType.NEUTRAL
        else:
            # Threshold-based classification
            if expected_direction == "positive":
                if value >= threshold:
                    return EvidenceType.SUPPORTING
                elif value <= -threshold:
                    return EvidenceType.CONTRADICTING
                else:
                    return EvidenceType.NEUTRAL
            elif expected_direction == "negative":
                if value <= -threshold:
                    return EvidenceType.SUPPORTING
                elif value >= threshold:
                    return EvidenceType.CONTRADICTING
                else:
                    return EvidenceType.NEUTRAL
            else:
                return EvidenceType.NEUTRAL
    
    def create_evidence_item(
        self,
        evidence_type: EvidenceType,
        source: str,
        value: Any,
        confidence: float,
        reliability: SourceReliability,
        metadata: Optional[Dict[str, Any]] = None
    ) -> EvidenceItem:
        """
        Create an evidence item with validation.
        
        Args:
            evidence_type: Type of evidence
            source: Description of evidence source
            value: Evidence value
            confidence: Confidence score (0.0 to 1.0)
            reliability: Source reliability level
            metadata: Additional metadata
            
        Returns:
            EvidenceItem object
            
        Raises:
            ValueError: If confidence is not in valid range
        """
        if not isinstance(confidence, (int, float)):
            raise ValueError(f"Confidence must be a number, got {type(confidence)}")
        
        if not 0.0 <= confidence <= 1.0:
            raise ValueError(f"Confidence must be between 0.0 and 1.0, got {confidence}")
        
        return EvidenceItem(
            type=evidence_type,
            source=source,
            value=value,
            confidence=confidence,
            reliability=reliability,
            timestamp=datetime.now(timezone.utc),
            metadata=metadata or {}
        )
    
    def analyze_market_conditions(
        self,
        spot: float,
        gamma_exposure: float,
        delta_exposure: float,
        vix: float,
        put_call_ratio: float,
        max_pain: float,
        context: Optional[Dict[str, Any]] = None
    ) -> EvidenceCollection:
        """
        Analyze market conditions and create evidence collection.
        
        This is a domain-specific method that demonstrates how to use the
        evidence engine for market intelligence analysis.
        
        Args:
            spot: Current spot price
            gamma_exposure: Net gamma exposure
            delta_exposure: Net delta exposure
            vix: VIX value
            put_call_ratio: Put/call ratio
            max_pain: Max pain price
            context: Additional market context
            
        Returns:
            EvidenceCollection with market condition analysis
        """
        context = context or {}
        conclusion = "Market condition analysis based on options structure"
        collection = self.create_evidence_collection(conclusion)
        
        # Gamma exposure evidence
        gamma_type = self.classify_evidence(
            gamma_exposure, 
            "positive", 
            threshold=10000000,
            context=context
        )
        collection.add_evidence(self.create_evidence_item(
            evidence_type=gamma_type,
            source="Gamma Exposure Calculation",
            value=gamma_exposure,
            confidence=0.9,
            reliability=SourceReliability.HIGH,
            metadata={"metric": "net_gamma_exposure", "threshold": 10000000}
        ))
        
        # Delta exposure evidence
        delta_type = self.classify_evidence(
            delta_exposure,
            "positive",
            threshold=5000000,
            context=context
        )
        collection.add_evidence(self.create_evidence_item(
            evidence_type=delta_type,
            source="Delta Exposure Calculation",
            value=delta_exposure,
            confidence=0.85,
            reliability=SourceReliability.HIGH,
            metadata={"metric": "net_delta_exposure", "threshold": 5000000}
        ))
        
        # VIX evidence
        vix_type = self.classify_evidence(
            vix,
            "negative",
            threshold=18.0,
            context=context
        )
        collection.add_evidence(self.create_evidence_item(
            evidence_type=vix_type,
            source="VIX Index",
            value=vix,
            confidence=0.95,
            reliability=SourceReliability.HIGH,
            metadata={"metric": "vix", "threshold": 18.0}
        ))
        
        # Put/Call ratio evidence
        pc_ratio_type = self.classify_evidence(
            put_call_ratio,
            "negative",
            threshold=1.0,
            context=context
        )
        collection.add_evidence(self.create_evidence_item(
            evidence_type=pc_ratio_type,
            source="Put/Call Ratio",
            value=put_call_ratio,
            confidence=0.8,
            reliability=SourceReliability.MEDIUM,
            metadata={"metric": "put_call_ratio", "threshold": 1.0}
        ))
        
        # Max pain position evidence
        max_pain_distance = (spot - max_pain) / spot if max_pain > 0 else 0
        max_pain_type = self.classify_evidence(
            max_pain_distance,
            "positive",
            threshold=0.01,
            context=context
        )
        collection.add_evidence(self.create_evidence_item(
            evidence_type=max_pain_type,
            source="Max Pain Analysis",
            value=max_pain_distance,
            confidence=0.75,
            reliability=SourceReliability.MEDIUM,
            metadata={
                "metric": "max_pain_distance",
                "spot": spot,
                "max_pain": max_pain,
                "threshold": 0.01
            }
        ))
        
        logger.info(f"Market condition analysis completed with {collection.total_confidence:.2f} confidence")
        return collection
    
    def detect_conflicts(self, collection: EvidenceCollection) -> List[Dict[str, Any]]:
        """
        Detect conflicting evidence in a collection.
        
        Args:
            collection: EvidenceCollection to analyze
            
        Returns:
            List of conflict descriptions
        """
        conflicts = []
        
        # Check for high-weight conflicting evidence
        high_supporting = [
            item for item in collection.supporting_evidence 
            if item.weight > 0.7
        ]
        high_contradicting = [
            item for item in collection.contradicting_evidence 
            if item.weight > 0.7
        ]
        
        if high_supporting and high_contradicting:
            conflicts.append({
                "type": "high_weight_conflict",
                "description": "High-weight evidence exists on both sides",
                "supporting_count": len(high_supporting),
                "contradicting_count": len(high_contradicting),
                "severity": "high"
            })
        
        # Check for reliability conflicts
        high_reliability_supporting = [
            item for item in collection.supporting_evidence
            if item.reliability == SourceReliability.HIGH
        ]
        high_reliability_contradicting = [
            item for item in collection.contradicting_evidence
            if item.reliability == SourceReliability.HIGH
        ]
        
        if high_reliability_supporting and high_reliability_contradicting:
            conflicts.append({
                "type": "reliability_conflict",
                "description": "High-reliability sources conflict",
                "supporting_count": len(high_reliability_supporting),
                "contradicting_count": len(high_reliability_contradicting),
                "severity": "medium"
            })
        
        return conflicts
    
    def get_missing_evidence_gaps(self, collection: EvidenceCollection) -> List[str]:
        """
        Identify missing evidence gaps that should be addressed.
        
        Args:
            collection: EvidenceCollection to analyze
            
        Returns:
            List of gap descriptions
        """
        gaps = []
        
        if not collection.missing_evidence:
            return gaps
        
        for item in collection.missing_evidence:
            gap_description = f"Missing evidence from {item.source}"
            if item.metadata:
                gap_description += f" for {item.metadata.get('metric', 'unknown metric')}"
            gaps.append(gap_description)
        
        return gaps
    
    def generate_evidence_report(
        self, 
        collection: EvidenceCollection 
    ) -> str:
        """
        Generate a human-readable evidence report.
        
        Args:
            collection: EvidenceCollection to report on
            
        Returns:
            Formatted evidence report string
        """
        report_lines = [
            f"EVIDENCE REPORT: {collection.conclusion}",
            f"Generated: {collection.generated_at.isoformat()}",
            "",
            f"Total Confidence: {collection.total_confidence:.2%}",
            f"Evidence Quality Score: {collection.evidence_quality_score:.2%}",
            "",
            f"Supporting Evidence: {len(collection.supporting_evidence)} items",
            f"Contradicting Evidence: {len(collection.contradicting_evidence)} items",
            f"Missing Evidence: {len(collection.missing_evidence)} items",
            f"Neutral Evidence: {len(collection.neutral_evidence)} items",
            ""
        ]
        
        if collection.supporting_evidence:
            report_lines.append("SUPPORTING EVIDENCE:")
            for item in collection.supporting_evidence:
                report_lines.append(
                    f"  - {item.source}: {item.value} "
                    f"(confidence: {item.confidence:.2f}, weight: {item.weight:.2f})"
                )
            report_lines.append("")
        
        if collection.contradicting_evidence:
            report_lines.append("CONTRADICTING EVIDENCE:")
            for item in collection.contradicting_evidence:
                report_lines.append(
                    f"  - {item.source}: {item.value} "
                    f"(confidence: {item.confidence:.2f}, weight: {item.weight:.2f})"
                )
            report_lines.append("")
        
        if collection.missing_evidence:
            report_lines.append("MISSING EVIDENCE:")
            for item in collection.missing_evidence:
                report_lines.append(f"  - {item.source}: {item.value}")
            report_lines.append("")
        
        # Add conflict detection
        conflicts = self.detect_conflicts(collection)
        if conflicts:
            report_lines.append("CONFLICTS DETECTED:")
            for conflict in conflicts:
                report_lines.append(f"  - {conflict['description']} (severity: {conflict['severity']})")
            report_lines.append("")
        
        # Add missing evidence gaps
        gaps = self.get_missing_evidence_gaps(collection)
        if gaps:
            report_lines.append("EVIDENCE GAPS:")
            for gap in gaps:
                report_lines.append(f"  - {gap}")
        
        return "\n".join(report_lines)


# Singleton instance for application-wide use
_evidence_engine_instance: Optional[EvidenceEngine] = None


def get_evidence_engine() -> EvidenceEngine:
    """
    Get the singleton EvidenceEngine instance.
    
    Returns:
        EvidenceEngine singleton instance
    """
    global _evidence_engine_instance
    if _evidence_engine_instance is None:
        _evidence_engine_instance = EvidenceEngine()
    return _evidence_engine_instance