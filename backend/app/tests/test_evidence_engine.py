"""
Comprehensive test suite for EvidenceEngine.

This test module validates the evidence-based reasoning engine functionality,
including evidence classification, confidence scoring, conflict detection,
and integration with market analysis.
"""

import pytest
from datetime import datetime, timezone
from app.analytics.evidence_engine import (
    EvidenceEngine,
    EvidenceCollection,
    EvidenceItem,
    EvidenceType,
    SourceReliability,
    get_evidence_engine
)


class TestEvidenceItem:
    """Test suite for EvidenceItem dataclass."""
    
    def test_evidence_item_creation(self):
        """Test creating a valid evidence item."""
        item = EvidenceItem(
            type=EvidenceType.SUPPORTING,
            source="Test Source",
            value=100.0,
            confidence=0.9,
            reliability=SourceReliability.HIGH,
            timestamp=datetime.now(timezone.utc)
        )
        
        assert item.type == EvidenceType.SUPPORTING
        assert item.source == "Test Source"
        assert item.value == 100.0
        assert item.confidence == 0.9
        assert item.reliability == SourceReliability.HIGH
        assert item.weight > 0  # Weight should be calculated
    
    def test_evidence_item_weight_calculation(self):
        """Test that weight is calculated correctly based on confidence and reliability."""
        # High confidence + high reliability should give highest weight
        high_item = EvidenceItem(
            type=EvidenceType.SUPPORTING,
            source="High Source",
            value=100.0,
            confidence=0.9,
            reliability=SourceReliability.HIGH,
            timestamp=datetime.now(timezone.utc)
        )
        
        # Low confidence + low reliability should give lowest weight
        low_item = EvidenceItem(
            type=EvidenceType.SUPPORTING,
            source="Low Source",
            value=100.0,
            confidence=0.3,
            reliability=SourceReliability.LOW,
            timestamp=datetime.now(timezone.utc)
        )
        
        assert high_item.weight > low_item.weight
        assert high_item.weight == 0.9  # 0.9 * 1.0
        assert low_item.weight == 0.15  # 0.3 * 0.5
    
    def test_evidence_item_invalid_confidence(self):
        """Test that invalid confidence raises ValueError."""
        engine = EvidenceEngine()
        
        with pytest.raises(ValueError):
            engine.create_evidence_item(
                evidence_type=EvidenceType.SUPPORTING,
                source="Test Source",
                value=100.0,
                confidence=1.5,  # Invalid: > 1.0
                reliability=SourceReliability.HIGH
            )
        
        with pytest.raises(ValueError):
            engine.create_evidence_item(
                evidence_type=EvidenceType.SUPPORTING,
                source="Test Source",
                value=100.0,
                confidence=-0.1,  # Invalid: < 0.0
                reliability=SourceReliability.HIGH
            )
        
        with pytest.raises(ValueError):
            engine.create_evidence_item(
                evidence_type=EvidenceType.SUPPORTING,
                source="Test Source",
                value=100.0,
                confidence="invalid",  # Invalid: not a number
                reliability=SourceReliability.HIGH
            )
    
    def test_evidence_item_to_dict(self):
        """Test converting evidence item to dictionary."""
        item = EvidenceItem(
            type=EvidenceType.SUPPORTING,
            source="Test Source",
            value=100.0,
            confidence=0.9,
            reliability=SourceReliability.HIGH,
            timestamp=datetime.now(timezone.utc),
            metadata={"test": "data"}
        )
        
        item_dict = item.to_dict()
        
        assert item_dict["type"] == "supporting"
        assert item_dict["source"] == "Test Source"
        assert item_dict["value"] == 100.0
        assert item_dict["confidence"] == 0.9
        assert item_dict["reliability"] == "high"
        assert item_dict["metadata"] == {"test": "data"}
        assert "weight" in item_dict


class TestEvidenceCollection:
    """Test suite for EvidenceCollection class."""
    
    def test_evidence_collection_creation(self):
        """Test creating an evidence collection."""
        collection = EvidenceCollection(conclusion="Test conclusion")
        
        assert collection.conclusion == "Test conclusion"
        assert len(collection.supporting_evidence) == 0
        assert len(collection.contradicting_evidence) == 0
        assert len(collection.missing_evidence) == 0
        assert collection.total_confidence == 0.0
        assert collection.evidence_quality_score == 0.0
    
    def test_add_evidence_supporting(self):
        """Test adding supporting evidence."""
        collection = EvidenceCollection(conclusion="Test conclusion")
        
        item = EvidenceItem(
            type=EvidenceType.SUPPORTING,
            source="Test Source",
            value=100.0,
            confidence=0.9,
            reliability=SourceReliability.HIGH,
            timestamp=datetime.now(timezone.utc)
        )
        
        collection.add_evidence(item)
        
        assert len(collection.supporting_evidence) == 1
        assert collection.total_confidence > 0.0
        assert collection.evidence_quality_score > 0.0
    
    def test_add_evidence_contradicting(self):
        """Test adding contradicting evidence."""
        collection = EvidenceCollection(conclusion="Test conclusion")
        
        item = EvidenceItem(
            type=EvidenceType.CONTRADICTING,
            source="Test Source",
            value=-100.0,
            confidence=0.9,
            reliability=SourceReliability.HIGH,
            timestamp=datetime.now(timezone.utc)
        )
        
        collection.add_evidence(item)
        
        assert len(collection.contradicting_evidence) == 1
        assert collection.total_confidence < 1.0  # Should reduce confidence
    
    def test_add_evidence_missing(self):
        """Test adding missing evidence."""
        collection = EvidenceCollection(conclusion="Test conclusion")
        
        item = EvidenceItem(
            type=EvidenceType.MISSING,
            source="Test Source",
            value=None,
            confidence=0.0,
            reliability=SourceReliability.UNKNOWN,
            timestamp=datetime.now(timezone.utc)
        )
        
        collection.add_evidence(item)
        
        assert len(collection.missing_evidence) == 1
        # Missing evidence should reduce quality score
        assert collection.evidence_quality_score < 1.0
    
    def test_confidence_calculation(self):
        """Test confidence calculation with mixed evidence."""
        collection = EvidenceCollection(conclusion="Test conclusion")
        
        # Add strong supporting evidence
        collection.add_evidence(EvidenceItem(
            type=EvidenceType.SUPPORTING,
            source="Source 1",
            value=100.0,
            confidence=0.9,
            reliability=SourceReliability.HIGH,
            timestamp=datetime.now(timezone.utc)
        ))
        
        # Add weak contradicting evidence
        collection.add_evidence(EvidenceItem(
            type=EvidenceType.CONTRADICTING,
            source="Source 2",
            value=-50.0,
            confidence=0.3,
            reliability=SourceReliability.LOW,
            timestamp=datetime.now(timezone.utc)
        ))
        
        # Net confidence should be positive but less than 1.0
        assert 0.5 < collection.total_confidence < 1.0
    
    def test_quality_score_calculation(self):
        """Test quality score calculation."""
        collection = EvidenceCollection(conclusion="Test conclusion")
        
        # Add high-reliability evidence
        collection.add_evidence(EvidenceItem(
            type=EvidenceType.SUPPORTING,
            source="High Reliability Source",
            value=100.0,
            confidence=0.9,
            reliability=SourceReliability.HIGH,
            timestamp=datetime.now(timezone.utc)
        ))
        
        initial_quality = collection.evidence_quality_score
        
        # Add missing evidence (should reduce quality)
        collection.add_evidence(EvidenceItem(
            type=EvidenceType.MISSING,
            source="Missing Source",
            value=None,
            confidence=0.0,
            reliability=SourceReliability.UNKNOWN,
            timestamp=datetime.now(timezone.utc)
        ))
        
        assert collection.evidence_quality_score < initial_quality
    
    def test_evidence_summary(self):
        """Test generating evidence summary."""
        collection = EvidenceCollection(conclusion="Test conclusion")
        
        collection.add_evidence(EvidenceItem(
            type=EvidenceType.SUPPORTING,
            source="Source 1",
            value=100.0,
            confidence=0.9,
            reliability=SourceReliability.HIGH,
            timestamp=datetime.now(timezone.utc)
        ))
        
        summary = collection.get_evidence_summary()
        
        assert summary["conclusion"] == "Test conclusion"
        assert summary["supporting_count"] == 1
        assert summary["contradicting_count"] == 0
        assert summary["total_confidence"] > 0.0
        assert "generated_at" in summary
    
    def test_evidence_collection_to_dict(self):
        """Test converting evidence collection to dictionary."""
        collection = EvidenceCollection(conclusion="Test conclusion")
        
        collection.add_evidence(EvidenceItem(
            type=EvidenceType.SUPPORTING,
            source="Test Source",
            value=100.0,
            confidence=0.9,
            reliability=SourceReliability.HIGH,
            timestamp=datetime.now(timezone.utc)
        ))
        
        collection_dict = collection.to_dict()
        
        assert collection_dict["conclusion"] == "Test conclusion"
        assert len(collection_dict["supporting_evidence"]) == 1
        assert "summary" in collection_dict


class TestEvidenceEngine:
    """Test suite for EvidenceEngine class."""
    
    def test_evidence_engine_initialization(self):
        """Test EvidenceEngine initialization."""
        engine = EvidenceEngine()
        
        assert engine is not None
        assert len(engine._evidence_collections) == 0
    
    def test_create_evidence_collection(self):
        """Test creating evidence collection through engine."""
        engine = EvidenceEngine()
        
        collection = engine.create_evidence_collection("Test conclusion")
        
        assert collection.conclusion == "Test conclusion"
        assert "Test conclusion" in engine._evidence_collections
    
    def test_classify_evidence_positive(self):
        """Test evidence classification for positive expected direction."""
        engine = EvidenceEngine()
        
        # Positive value with positive direction should be supporting
        classification = engine.classify_evidence(
            value=100.0,
            expected_direction="positive"
        )
        assert classification == EvidenceType.SUPPORTING
        
        # Negative value with positive direction should be contradicting
        classification = engine.classify_evidence(
            value=-100.0,
            expected_direction="positive"
        )
        assert classification == EvidenceType.CONTRADICTING
    
    def test_classify_evidence_negative(self):
        """Test evidence classification for negative expected direction."""
        engine = EvidenceEngine()
        
        # Negative value with negative direction should be supporting
        classification = engine.classify_evidence(
            value=-100.0,
            expected_direction="negative"
        )
        assert classification == EvidenceType.SUPPORTING
        
        # Positive value with negative direction should be contradicting
        classification = engine.classify_evidence(
            value=100.0,
            expected_direction="negative"
        )
        assert classification == EvidenceType.CONTRADICTING
    
    def test_classify_evidence_with_threshold(self):
        """Test evidence classification with threshold."""
        engine = EvidenceEngine()
        
        # Value above threshold with positive direction should be supporting
        classification = engine.classify_evidence(
            value=15.0,
            expected_direction="positive",
            threshold=10.0
        )
        assert classification == EvidenceType.SUPPORTING
        
        # Value below threshold with positive direction should be neutral
        classification = engine.classify_evidence(
            value=5.0,
            expected_direction="positive",
            threshold=10.0
        )
        assert classification == EvidenceType.NEUTRAL
    
    def test_classify_evidence_missing_value(self):
        """Test evidence classification for missing values."""
        engine = EvidenceEngine()
        
        classification = engine.classify_evidence(
            value=None,
            expected_direction="positive"
        )
        assert classification == EvidenceType.MISSING
    
    def test_create_evidence_item(self):
        """Test creating evidence item through engine."""
        engine = EvidenceEngine()
        
        item = engine.create_evidence_item(
            evidence_type=EvidenceType.SUPPORTING,
            source="Test Source",
            value=100.0,
            confidence=0.9,
            reliability=SourceReliability.HIGH
        )
        
        assert item.type == EvidenceType.SUPPORTING
        assert item.source == "Test Source"
        assert item.value == 100.0
        assert item.confidence == 0.9
        assert item.reliability == SourceReliability.HIGH
    
    def test_analyze_market_conditions(self):
        """Test market condition analysis."""
        engine = EvidenceEngine()
        
        collection = engine.analyze_market_conditions(
            spot=550.0,
            gamma_exposure=100000000,  # Positive GEX
            delta_exposure=50000000,   # Positive DEX
            vix=13.5,                 # Low VIX
            put_call_ratio=0.8,        # Low P/C ratio
            max_pain=548.0
        )
        
        assert collection.conclusion == "Market condition analysis based on options structure"
        assert len(collection.supporting_evidence) > 0  # Should have supporting evidence
        assert collection.total_confidence > 0.0
    
    def test_detect_conflicts(self):
        """Test conflict detection."""
        engine = EvidenceEngine()
        
        collection = EvidenceCollection(conclusion="Test conclusion")
        
        # Add high-weight supporting evidence
        collection.add_evidence(EvidenceItem(
            type=EvidenceType.SUPPORTING,
            source="Source 1",
            value=100.0,
            confidence=0.9,
            reliability=SourceReliability.HIGH,
            timestamp=datetime.now(timezone.utc)
        ))
        
        # Add high-weight contradicting evidence
        collection.add_evidence(EvidenceItem(
            type=EvidenceType.CONTRADICTING,
            source="Source 2",
            value=-100.0,
            confidence=0.9,
            reliability=SourceReliability.HIGH,
            timestamp=datetime.now(timezone.utc)
        ))
        
        conflicts = engine.detect_conflicts(collection)
        
        assert len(conflicts) > 0
        assert any(conflict["type"] == "high_weight_conflict" for conflict in conflicts)
    
    def test_get_missing_evidence_gaps(self):
        """Test identification of missing evidence gaps."""
        engine = EvidenceEngine()
        
        collection = EvidenceCollection(conclusion="Test conclusion")
        
        collection.add_evidence(EvidenceItem(
            type=EvidenceType.MISSING,
            source="Missing Source",
            value=None,
            confidence=0.0,
            reliability=SourceReliability.UNKNOWN,
            timestamp=datetime.now(timezone.utc),
            metadata={"metric": "test_metric"}
        ))
        
        gaps = engine.get_missing_evidence_gaps(collection)
        
        assert len(gaps) > 0
        assert any("Missing Source" in gap for gap in gaps)
    
    def test_generate_evidence_report(self):
        """Test generating evidence report."""
        engine = EvidenceEngine()
        
        collection = EvidenceCollection(conclusion="Test conclusion")
        
        collection.add_evidence(EvidenceItem(
            type=EvidenceType.SUPPORTING,
            source="Test Source",
            value=100.0,
            confidence=0.9,
            reliability=SourceReliability.HIGH,
            timestamp=datetime.now(timezone.utc)
        ))
        
        report = engine.generate_evidence_report(collection)
        
        assert "EVIDENCE REPORT" in report
        assert "Test conclusion" in report
        assert "SUPPORTING EVIDENCE" in report
        assert "Total Confidence" in report


class TestEvidenceEngineIntegration:
    """Integration tests for EvidenceEngine with other components."""
    
    def test_singleton_pattern(self):
        """Test that get_evidence_engine returns singleton instance."""
        engine1 = get_evidence_engine()
        engine2 = get_evidence_engine()
        
        assert engine1 is engine2
    
    def test_market_analysis_with_various_conditions(self):
        """Test market analysis with different market conditions."""
        engine = EvidenceEngine()
        
        # Bullish conditions
        bullish_collection = engine.analyze_market_conditions(
            spot=550.0,
            gamma_exposure=150000000,  # Strong positive GEX
            delta_exposure=75000000,   # Strong positive DEX
            vix=12.0,                 # Very low VIX
            put_call_ratio=0.7,        # Very low P/C ratio
            max_pain=545.0
        )
        
        assert bullish_collection.total_confidence > 0.7  # Should be high confidence
        
        # Bearish conditions
        bearish_collection = engine.analyze_market_conditions(
            spot=550.0,
            gamma_exposure=-150000000, # Strong negative GEX
            delta_exposure=-75000000,  # Strong negative DEX
            vix=25.0,                 # High VIX
            put_call_ratio=1.3,        # High P/C ratio
            max_pain=555.0
        )
        
        assert bearish_collection.total_confidence < 0.5  # Should be low confidence (contradicting)
    
    def test_evidence_quality_with_mixed_reliability(self):
        """Test evidence quality with mixed source reliability."""
        engine = EvidenceEngine()
        
        collection = EvidenceCollection(conclusion="Test conclusion")
        
        # Add high-reliability evidence
        collection.add_evidence(EvidenceItem(
            type=EvidenceType.SUPPORTING,
            source="High Reliability",
            value=100.0,
            confidence=0.9,
            reliability=SourceReliability.HIGH,
            timestamp=datetime.now(timezone.utc)
        ))
        
        # Add low-reliability evidence
        collection.add_evidence(EvidenceItem(
            type=EvidenceType.SUPPORTING,
            source="Low Reliability",
            value=50.0,
            confidence=0.7,
            reliability=SourceReliability.LOW,
            timestamp=datetime.now(timezone.utc)
        ))
        
        quality_score = collection.evidence_quality_score
        
        # Quality should be between high and low due to mixed reliability
        assert 0.5 < quality_score < 1.0


class TestEvidenceEngineEdgeCases:
    """Test edge cases and error conditions."""
    
    def test_empty_evidence_collection(self):
        """Test evidence collection with no evidence."""
        collection = EvidenceCollection(conclusion="Empty conclusion")
        
        assert collection.total_confidence == 0.0
        assert collection.evidence_quality_score == 0.0
        
        summary = collection.get_evidence_summary()
        assert summary["supporting_count"] == 0
        assert summary["contradicting_count"] == 0
    
    def test_extreme_confidence_values(self):
        """Test evidence with extreme confidence values."""
        engine = EvidenceEngine()
        
        # Test minimum confidence
        item_min = engine.create_evidence_item(
            evidence_type=EvidenceType.SUPPORTING,
            source="Test",
            value=100.0,
            confidence=0.0,
            reliability=SourceReliability.HIGH
        )
        assert item_min.weight == 0.0
        
        # Test maximum confidence
        item_max = engine.create_evidence_item(
            evidence_type=EvidenceType.SUPPORTING,
            source="Test",
            value=100.0,
            confidence=1.0,
            reliability=SourceReliability.HIGH
        )
        assert item_max.weight == 1.0
    
    def test_zero_values(self):
        """Test evidence with zero values."""
        engine = EvidenceEngine()
        
        classification = engine.classify_evidence(
            value=0.0,
            expected_direction="positive"
        )
        
        # Zero value should be classified as neutral (not positive or negative)
        assert classification == EvidenceType.NEUTRAL
        
        # Test with negative direction
        classification = engine.classify_evidence(
            value=0.0,
            expected_direction="negative"
        )
        assert classification == EvidenceType.NEUTRAL
    
    def test_very_large_values(self):
        """Test evidence with very large values."""
        engine = EvidenceEngine()
        
        classification = engine.classify_evidence(
            value=1e15,  # Very large value
            expected_direction="positive"
        )
        
        assert classification == EvidenceType.SUPPORTING