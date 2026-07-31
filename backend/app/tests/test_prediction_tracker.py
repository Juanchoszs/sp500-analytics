"""
Tests comprehensivos para el sistema de tracking de predicciones.
Valida el ciclo completo de vida de las predicciones: registro, evaluación,
cálculo de métricas y ajuste de confianza.
"""
from datetime import datetime, timedelta
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.prediction_models import (
    Prediction, 
    PredictionEvaluation, 
    PredictionMetrics,
    PredictionType,
    PredictionOutcome,
    Base
)
from app.analytics.prediction_tracker import (
    PredictionTracker,
    PredictionRecord,
    AccuracyMetrics,
    ConfidenceAdjustment
)


# Setup de base de datos para tests
TEST_DATABASE_URL = "sqlite:///./test_predictions.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Fixture que crea una sesión de base de datos para cada test."""
    Base.metadata.create_all(bind=test_engine)
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def prediction_tracker(db_session):
    """Fixture que crea una instancia de PredictionTracker."""
    return PredictionTracker(db_session)


class TestPredictionRecord:
    """Tests para la estructura de PredictionRecord."""
    
    def test_prediction_record_creation(self):
        """Test de creación de un registro de predicción válido."""
        record = PredictionRecord(
            ticker="SPY",
            prediction_type="directional",
            prediction_key="test_prediction_1",
            predicted_value="bullish",
            confidence_score=0.8,
            reasoning="Strong gamma support",
            spot_price=550.0,
            market_regime="long_gamma",
            vix_level=13.5,
            net_gex=1000000,
            net_dex=500000
        )
        
        assert record.ticker == "SPY"
        assert record.prediction_type == "directional"
        assert record.confidence_score == 0.8
        assert record.spot_price == 550.0


class TestPredictionTracker:
    """Tests para la clase principal PredictionTracker."""
    
    def test_record_prediction(self, prediction_tracker):
        """Test de registro de una nueva predicción."""
        record = PredictionRecord(
            ticker="SPY",
            prediction_type="directional",
            prediction_key="test_directional_1",
            predicted_value="bullish",
            confidence_score=0.75,
            reasoning="Strong bullish indicators",
            spot_price=550.0,
            market_regime="long_gamma",
            vix_level=13.5
        )
        
        prediction = prediction_tracker.record_prediction(record)
        
        assert prediction.id is not None
        assert prediction.ticker == "SPY"
        assert prediction.prediction_type == "directional"
        assert prediction.predicted_value == "bullish"
        assert prediction.confidence_score == 0.75
        assert prediction.outcome == PredictionOutcome.PENDING.value
        assert prediction.created_at is not None
    
    def test_record_prediction_with_confidence_adjustment(self, prediction_tracker):
        """Test de ajuste de confianza al registrar predicción."""
        # Primero crear algunas predicciones históricas para建立 historial
        historical_record = PredictionRecord(
            ticker="SPY",
            prediction_type="directional",
            prediction_key="historical_1",
            predicted_value="bullish",
            confidence_score=0.8,
            spot_price=540.0
        )
        
        pred = prediction_tracker.record_prediction(historical_record)
        
        # Evaluarla como correcta para建立 buen historial
        prediction_tracker.evaluate_prediction(
            prediction_id=pred.id,
            actual_value="545.0",
            outcome=PredictionOutcome.CORRECT,
            evaluation_method="test"
        )
        
        # Crear nueva predicción - debería tener confianza ajustada
        new_record = PredictionRecord(
            ticker="SPY",
            prediction_type="directional",
            prediction_key="new_prediction",
            predicted_value="bullish",
            confidence_score=0.7,
            spot_price=550.0
        )
        
        new_prediction = prediction_tracker.record_prediction(new_record)
        
        # La confianza ajustada debería ser cercana a la original dado el buen historial
        assert new_prediction.confidence_adjusted is not None
        assert new_prediction.confidence_adjusted <= new_prediction.confidence_score
    
    def test_evaluate_prediction_correct(self, prediction_tracker):
        """Test de evaluación de predicción correcta."""
        # Crear predicción
        record = PredictionRecord(
            ticker="SPY",
            prediction_type="directional",
            prediction_key="eval_test_1",
            predicted_value="bullish",
            confidence_score=0.8,
            spot_price=550.0
        )
        
        prediction = prediction_tracker.record_prediction(record)
        
        # Evaluar como correcta
        evaluated = prediction_tracker.evaluate_prediction(
            prediction_id=prediction.id,
            actual_value="555.0",
            outcome=PredictionOutcome.CORRECT,
            evaluation_method="test",
            notes="Price moved up as expected"
        )
        
        assert evaluated.outcome == PredictionOutcome.CORRECT.value
        assert evaluated.actual_value == "555.0"
        assert evaluated.evaluated_at is not None
        assert evaluated.evaluation_notes == "Price moved up as expected"
        assert evaluated.calibration_error is not None
    
    def test_evaluate_prediction_incorrect(self, prediction_tracker):
        """Test de evaluación de predicción incorrecta."""
        record = PredictionRecord(
            ticker="SPY",
            prediction_type="directional",
            prediction_key="eval_test_2",
            predicted_value="bullish",
            confidence_score=0.8,
            spot_price=550.0
        )
        
        prediction = prediction_tracker.record_prediction(record)
        
        evaluated = prediction_tracker.evaluate_prediction(
            prediction_id=prediction.id,
            actual_value="545.0",
            outcome=PredictionOutcome.INCORRECT,
            evaluation_method="test"
        )
        
        assert evaluated.outcome == PredictionOutcome.INCORRECT.value
        assert evaluated.calibration_error is not None
    
    def test_evaluate_nonexistent_prediction(self, prediction_tracker):
        """Test de evaluación de predicción inexistente."""
        with pytest.raises(ValueError, match="Prediction with id 999 not found"):
            prediction_tracker.evaluate_prediction(
                prediction_id=999,
                actual_value="550.0",
                outcome=PredictionOutcome.CORRECT
            )
    
    def test_calculate_accuracy_metrics_no_predictions(self, prediction_tracker):
        """Test de cálculo de métricas sin predicciones."""
        metrics = prediction_tracker.calculate_accuracy_metrics(
            ticker="SPY",
            prediction_type="directional"
        )
        
        assert metrics.total_predictions == 0
        assert metrics.correct_predictions == 0
        assert metrics.accuracy_rate == 0.0
        assert metrics.precision == 0.0
        assert metrics.recall == 0.0
        assert metrics.f1_score == 0.0
    
    def test_calculate_accuracy_metrics_with_predictions(self, prediction_tracker):
        """Test de cálculo de métricas con predicciones."""
        # Crear varias predicciones
        for i in range(5):
            record = PredictionRecord(
                ticker="SPY",
                prediction_type="directional",
                prediction_key=f"metrics_test_{i}",
                predicted_value="bullish" if i % 2 == 0 else "bearish",
                confidence_score=0.7,
                spot_price=550.0
            )
            pred = prediction_tracker.record_prediction(record)
            
            # Evaluar (3 correctas, 2 incorrectas)
            outcome = PredictionOutcome.CORRECT if i % 2 == 0 else PredictionOutcome.INCORRECT
            prediction_tracker.evaluate_prediction(
                prediction_id=pred.id,
                actual_value="555.0" if i % 2 == 0 else "545.0",
                outcome=outcome,
                evaluation_method="test"
            )
        
        metrics = prediction_tracker.calculate_accuracy_metrics(
            ticker="SPY",
            prediction_type="directional"
        )
        
        assert metrics.total_predictions == 5
        assert metrics.correct_predictions == 3
        assert metrics.accuracy_rate == 0.6
        assert metrics.precision == 0.6
        assert metrics.f1_score > 0
    
    def test_get_pending_evaluations(self, prediction_tracker):
        """Test de obtención de predicciones pendientes."""
        # Crear predicciones pendientes
        for i in range(3):
            record = PredictionRecord(
                ticker="SPY",
                prediction_type="directional",
                prediction_key=f"pending_{i}",
                predicted_value="bullish",
                confidence_score=0.7,
                spot_price=550.0
            )
            prediction_tracker.record_prediction(record)
        
        # Crear una ya evaluada
        evaluated_record = PredictionRecord(
            ticker="SPY",
            prediction_type="directional",
            prediction_key="evaluated",
            predicted_value="bullish",
            confidence_score=0.7,
            spot_price=550.0
        )
        pred = prediction_tracker.record_prediction(evaluated_record)
        prediction_tracker.evaluate_prediction(
            prediction_id=pred.id,
            actual_value="555.0",
            outcome=PredictionOutcome.CORRECT,
            evaluation_method="test"
        )
        
        pending = prediction_tracker.get_pending_evaluations(ticker="SPY")
        
        assert len(pending) == 3
        for p in pending:
            assert p.outcome == PredictionOutcome.PENDING.value
    
    def test_get_historical_accuracy(self, prediction_tracker):
        """Test de obtención de accuracy histórica."""
        # Crear predicciones históricas
        for i in range(10):
            record = PredictionRecord(
                ticker="SPY",
                prediction_type="directional",
                prediction_key=f"hist_{i}",
                predicted_value="bullish",
                confidence_score=0.7,
                spot_price=550.0,
                created_at=datetime.utcnow() - timedelta(days=i)  # Distribuir en tiempo
            )
            pred = prediction_tracker.record_prediction(record)
            
            outcome = PredictionOutcome.CORRECT if i < 7 else PredictionOutcome.INCORRECT
            prediction_tracker.evaluate_prediction(
                prediction_id=pred.id,
                actual_value="555.0",
                outcome=outcome,
                evaluation_method="test"
            )
        
        accuracy = prediction_tracker.get_historical_accuracy(
            ticker="SPY",
            prediction_type="directional",
            days=30
        )
        
        assert accuracy == 0.7  # 7 de 10 correctas
    
    def test_confidence_adjustment_from_history(self, prediction_tracker):
        """Test de ajuste de confianza basado en historial."""
        # Sin historial
        adjustment = prediction_tracker._adjust_confidence_from_history(
            ticker="SPY",
            prediction_type="directional",
            original_confidence=0.8
        )
        
        assert adjustment.original_confidence == 0.8
        assert adjustment.adjusted_confidence == 0.8  # Sin ajuste sin historial
        assert adjustment.historical_accuracy == 0.0
        
        # Con buen historial
        for i in range(5):
            record = PredictionRecord(
                ticker="SPY",
                prediction_type="directional",
                prediction_key=f"adj_{i}",
                predicted_value="bullish",
                confidence_score=0.7,
                spot_price=550.0
            )
            pred = prediction_tracker.record_prediction(record)
            prediction_tracker.evaluate_prediction(
                prediction_id=pred.id,
                actual_value="555.0",
                outcome=PredictionOutcome.CORRECT,
                evaluation_method="test"
            )
        
        adjustment = prediction_tracker._adjust_confidence_from_history(
            ticker="SPY",
            prediction_type="directional",
            original_confidence=0.8
        )
        
        assert adjustment.original_confidence == 0.8
        assert adjustment.adjusted_confidence > 0.4  # Debería mantenerse alta
        assert adjustment.historical_accuracy == 1.0  # 100% accuracy
    
    def test_calculate_error_margin_numeric(self, prediction_tracker):
        """Test de cálculo de margen de error para valores numéricos."""
        error = prediction_tracker._calculate_error_margin("550.0", "555.0")
        assert error is not None
        assert error == abs(550.0 - 555.0) / 555.0
    
    def test_calculate_error_margin_text(self, prediction_tracker):
        """Test de cálculo de margen de error para valores no numéricos."""
        error = prediction_tracker._calculate_error_margin("bullish", "bearish")
        assert error is None  # No aplicable para texto
    
    def test_get_calibration_report(self, prediction_tracker):
        """Test de generación de reporte de calibración."""
        # Crear predicciones con diferentes niveles de confianza
        confidence_levels = [0.9, 0.8, 0.6, 0.4, 0.3]
        for i, conf in enumerate(confidence_levels):
            record = PredictionRecord(
                ticker="SPY",
                prediction_type="directional",
                prediction_key=f"calib_{i}",
                predicted_value="bullish",
                confidence_score=conf,
                spot_price=550.0
            )
            pred = prediction_tracker.record_prediction(record)
            
            # Evaluar: alta confianza = correcto, baja = incorrecto
            outcome = PredictionOutcome.CORRECT if conf >= 0.6 else PredictionOutcome.INCORRECT
            prediction_tracker.evaluate_prediction(
                prediction_id=pred.id,
                actual_value="555.0",
                outcome=outcome,
                evaluation_method="test"
            )
        
        report = prediction_tracker.get_calibration_report(
            ticker="SPY",
            prediction_type="directional"
        )
        
        assert report["ticker"] == "SPY"
        assert report["prediction_type"] == "directional"
        assert report["total_evaluated"] == 5
        assert "by_confidence_level" in report
        assert "high" in report["by_confidence_level"]
        assert "medium" in report["by_confidence_level"]
        assert "low" in report["by_confidence_level"]
    
    def test_update_aggregated_metrics(self, prediction_tracker):
        """Test de actualización de métricas agregadas."""
        # Crear predicciones
        for i in range(5):
            record = PredictionRecord(
                ticker="SPY",
                prediction_type="directional",
                prediction_key=f"agg_{i}",
                predicted_value="bullish",
                confidence_score=0.7,
                spot_price=550.0
            )
            pred = prediction_tracker.record_prediction(record)
            
            outcome = PredictionOutcome.CORRECT if i < 3 else PredictionOutcome.INCORRECT
            prediction_tracker.evaluate_prediction(
                prediction_id=pred.id,
                actual_value="555.0",
                outcome=outcome,
                evaluation_method="test"
            )
        
        # Actualizar métricas
        prediction_tracker._update_aggregated_metrics("SPY", "directional")
        
        # Verificar que se crearon las métricas agregadas
        daily_metrics = prediction_tracker.db.query(PredictionMetrics).filter(
            PredictionMetrics.ticker == "SPY",
            PredictionMetrics.prediction_type == "directional",
            PredictionMetrics.time_window == "daily"
        ).first()
        
        assert daily_metrics is not None
        assert daily_metrics.total_predictions == 5
        assert daily_metrics.accuracy_rate == 0.6


class TestAccuracyMetrics:
    """Tests para la estructura de AccuracyMetrics."""
    
    def test_accuracy_metrics_creation(self):
        """Test de creación de métricas de accuracy."""
        metrics = AccuracyMetrics(
            total_predictions=100,
            correct_predictions=75,
            accuracy_rate=0.75,
            precision=0.8,
            recall=0.9,
            f1_score=0.85,
            calibration_error=0.1,
            calibration_score=0.9
        )
        
        assert metrics.total_predictions == 100
        assert metrics.accuracy_rate == 0.75
        assert metrics.f1_score == 0.85


class TestConfidenceAdjustment:
    """Tests para la estructura de ConfidenceAdjustment."""
    
    def test_confidence_adjustment_creation(self):
        """Test de creación de ajuste de confianza."""
        adjustment = ConfidenceAdjustment(
            original_confidence=0.8,
            adjusted_confidence=0.75,
            adjustment_factor=0.94,
            historical_accuracy=0.7,
            confidence_level="high"
        )
        
        assert adjustment.original_confidence == 0.8
        assert adjustment.adjusted_confidence == 0.75
        assert adjustment.confidence_level == "high"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])