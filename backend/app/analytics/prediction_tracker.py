"""
Sistema de tracking y validación de predicciones.
Permite registrar, evaluar y mejorar la calidad de las predicciones del sistema
de inteligencia cuantitativa mediante métricas de accuracy y calibración.
"""
from datetime import datetime, timedelta
from typing import Any, Optional
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.db.prediction_models import (
    Prediction, 
    PredictionEvaluation, 
    PredictionMetrics,
    PredictionType,
    PredictionOutcome
)


@dataclass
class PredictionRecord:
    """Estructura para registrar una nueva predicción."""
    ticker: str
    prediction_type: str
    prediction_key: str
    predicted_value: str
    confidence_score: float
    reasoning: Optional[str] = None
    spot_price: Optional[float] = None
    expiration: Optional[str] = None
    market_regime: Optional[str] = None
    vix_level: Optional[float] = None
    net_gex: Optional[float] = None
    net_dex: Optional[float] = None
    target_evaluation_time: Optional[datetime] = None


@dataclass
class AccuracyMetrics:
    """Métricas de accuracy calculadas."""
    total_predictions: int
    correct_predictions: int
    accuracy_rate: float
    precision: float
    recall: float
    f1_score: float
    calibration_error: float
    calibration_score: float


@dataclass
class ConfidenceAdjustment:
    """Resultado del ajuste de confianza basado en historial."""
    original_confidence: float
    adjusted_confidence: float
    adjustment_factor: float
    historical_accuracy: float
    confidence_level: str  # "high", "medium", "low"


class PredictionTracker:
    """
    Motor principal de tracking de predicciones.
    Gestiona el ciclo de vida completo de las predicciones: registro, evaluación,
    cálculo de métricas y ajuste de confianza.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def record_prediction(self, record: PredictionRecord) -> Prediction:
        """
        Registra una nueva predicción en el sistema.
        
        Args:
            record: Datos de la predicción a registrar
            
        Returns:
            La predicción registrada con ID asignado
        """
        # Ajustar confianza basada en historial antes de guardar
        adjustment = self._adjust_confidence_from_history(
            record.ticker, 
            record.prediction_type, 
            record.confidence_score
        )
        
        prediction = Prediction(
            ticker=record.ticker,
            prediction_type=record.prediction_type,
            prediction_key=record.prediction_key,
            predicted_value=record.predicted_value,
            confidence_score=record.confidence_score,
            confidence_adjusted=adjustment.adjusted_confidence,
            reasoning=record.reasoning,
            spot_price=record.spot_price,
            expiration=record.expiration,
            market_regime=record.market_regime,
            vix_level=record.vix_level,
            net_gex=record.net_gex,
            net_dex=record.net_dex,
            target_evaluation_time=record.target_evaluation_time,
            outcome=PredictionOutcome.PENDING.value
        )
        
        self.db.add(prediction)
        self.db.commit()
        self.db.refresh(prediction)
        
        return prediction
    
    def evaluate_prediction(
        self, 
        prediction_id: int, 
        actual_value: str,
        outcome: PredictionOutcome,
        evaluation_method: str = "automatic",
        notes: Optional[str] = None
    ) -> Prediction:
        """
        Evalúa una predicción registrada contra el valor real observado.
        
        Args:
            prediction_id: ID de la predicción a evaluar
            actual_value: Valor real observado
            outcome: Resultado de la evaluación
            evaluation_method: Método utilizado para la evaluación
            notes: Notas adicionales sobre la evaluación
            
        Returns:
            La predicción actualizada con el resultado
        """
        prediction = self.db.query(Prediction).filter(
            Prediction.id == prediction_id
        ).first()
        
        if not prediction:
            raise ValueError(f"Prediction with id {prediction_id} not found")
        
        # Calcular margen de error si aplica
        error_margin = self._calculate_error_margin(
            prediction.predicted_value, 
            actual_value
        )
        
        # Actualizar predicción
        prediction.outcome = outcome.value
        prediction.actual_value = actual_value
        prediction.error_margin = error_margin
        prediction.evaluated_at = datetime.utcnow()
        prediction.evaluation_notes = notes
        
        # Calcular error de calibración
        if outcome == PredictionOutcome.CORRECT:
            prediction.calibration_error = abs(prediction.confidence_score - 1.0)
        elif outcome == PredictionOutcome.INCORRECT:
            prediction.calibration_error = abs(prediction.confidence_score - 0.0)
        else:
            prediction.calibration_error = 0.5  # Neutral para resultados parciales
        
        # Crear evaluación detallada
        evaluation = PredictionEvaluation(
            prediction_id=prediction.id,
            evaluation_method=evaluation_method,
            expected_confidence=prediction.confidence_score,
            calibration_error=prediction.calibration_error,
            notes=notes
        )
        
        self.db.add(evaluation)
        self.db.commit()
        self.db.refresh(prediction)
        
        # Actualizar métricas agregadas
        self._update_aggregated_metrics(
            prediction.ticker,
            prediction.prediction_type
        )
        
        return prediction
    
    def calculate_accuracy_metrics(
        self,
        ticker: str,
        prediction_type: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> AccuracyMetrics:
        """
        Calcula métricas de accuracy para un tipo de predicción.
        
        Args:
            ticker: Ticker a analizar
            prediction_type: Tipo de predicción
            start_date: Fecha de inicio (opcional)
            end_date: Fecha de fin (opcional)
            
        Returns:
            Métricas de accuracy calculadas
        """
        query = self.db.query(Prediction).filter(
            Prediction.ticker == ticker,
            Prediction.prediction_type == prediction_type,
            Prediction.outcome.in_([
                PredictionOutcome.CORRECT.value,
                PredictionOutcome.INCORRECT.value
            ])
        )
        
        if start_date:
            query = query.filter(Prediction.created_at >= start_date)
        if end_date:
            query = query.filter(Prediction.created_at <= end_date)
        
        predictions = query.all()
        
        if not predictions:
            return AccuracyMetrics(
                total_predictions=0,
                correct_predictions=0,
                accuracy_rate=0.0,
                precision=0.0,
                recall=0.0,
                f1_score=0.0,
                calibration_error=0.5,
                calibration_score=0.0
            )
        
        total = len(predictions)
        correct = sum(1 for p in predictions if p.outcome == PredictionOutcome.CORRECT.value)
        incorrect = total - correct
        
        # Métricas básicas
        accuracy_rate = correct / total if total > 0 else 0.0
        
        # Precision = TP / (TP + FP)
        # Para simplificar, asumimos correctos como TP e incorrectos como FP
        precision = correct / total if total > 0 else 0.0
        
        # Recall = TP / (TP + FN)
        # Asumimos que no hay falsos negativos en este contexto
        recall = 1.0 if correct > 0 else 0.0
        
        # F1 Score
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        # Calibración: qué tan bien la confianza predice la accuracy
        calibration_errors = [p.calibration_error for p in predictions if p.calibration_error is not None]
        avg_calibration_error = sum(calibration_errors) / len(calibration_errors) if calibration_errors else 0.5
        calibration_score = 1.0 - avg_calibration_error
        
        return AccuracyMetrics(
            total_predictions=total,
            correct_predictions=correct,
            accuracy_rate=accuracy_rate,
            precision=precision,
            recall=recall,
            f1_score=f1,
            calibration_error=avg_calibration_error,
            calibration_score=calibration_score
        )
    
    def get_pending_evaluations(self, ticker: Optional[str] = None) -> list[Prediction]:
        """
        Obtiene predicciones pendientes de evaluación.
        
        Args:
            ticker: Filtrar por ticker específico (opcional)
            
        Returns:
            Lista de predicciones pendientes
        """
        query = self.db.query(Prediction).filter(
            Prediction.outcome == PredictionOutcome.PENDING.value
        )
        
        if ticker:
            query = query.filter(Prediction.ticker == ticker)
        
        # Incluir solo las que ya pasaron su tiempo de evaluación
        now = datetime.utcnow()
        query = query.filter(
            or_(
                Prediction.target_evaluation_time <= now,
                Prediction.target_evaluation_time.is_(None)
            )
        )
        
        return query.all()
    
    def get_historical_accuracy(
        self,
        ticker: str,
        prediction_type: str,
        days: int = 30
    ) -> float:
        """
        Obtiene la accuracy histórica para un tipo de predicción.
        
        Args:
            ticker: Ticker a analizar
            prediction_type: Tipo de predicción
            days: Días de historial a considerar
            
        Returns:
            Tasa de accuracy histórica (0.0 a 1.0)
        """
        start_date = datetime.utcnow() - timedelta(days=days)
        metrics = self.calculate_accuracy_metrics(ticker, prediction_type, start_date)
        return metrics.accuracy_rate
    
    def _adjust_confidence_from_history(
        self,
        ticker: str,
        prediction_type: str,
        original_confidence: float
    ) -> ConfidenceAdjustment:
        """
        Ajusta la confianza basada en el historial de accuracy.
        
        Args:
            ticker: Ticker de la predicción
            prediction_type: Tipo de predicción
            original_confidence: Confianza original del modelo
            
        Returns:
            Ajuste de confianza calculado
        """
        # Obtener accuracy histórica de los últimos 30 días
        historical_accuracy = self.get_historical_accuracy(ticker, prediction_type, days=30)
        
        # Si no hay suficiente historial, no ajustar
        if historical_accuracy == 0.0:
            return ConfidenceAdjustment(
                original_confidence=original_confidence,
                adjusted_confidence=original_confidence,
                adjustment_factor=1.0,
                historical_accuracy=0.0,
                confidence_level="medium"
            )
        
        # Factor de ajuste: si el modelo es histórico bueno, mantener confianza
        # Si es malo, reducir la confianza proporcionalmente
        adjustment_factor = 0.5 + (0.5 * historical_accuracy)  # Rango: 0.5 a 1.0
        adjusted_confidence = original_confidence * adjustment_factor
        
        # Determinar nivel de confianza
        if adjusted_confidence >= 0.7:
            level = "high"
        elif adjusted_confidence >= 0.4:
            level = "medium"
        else:
            level = "low"
        
        return ConfidenceAdjustment(
            original_confidence=original_confidence,
            adjusted_confidence=adjusted_confidence,
            adjustment_factor=adjustment_factor,
            historical_accuracy=historical_accuracy,
            confidence_level=level
        )
    
    def _calculate_error_margin(self, predicted: str, actual: str) -> Optional[float]:
        """
        Calcula el margen de error entre valor predicho y real.
        
        Args:
            predicted: Valor predicho (como string)
            actual: Valor real observado (como string)
            
        Returns:
            Margen de error numérico si aplica, None en caso contrario
        """
        try:
            pred_float = float(predicted)
            act_float = float(actual)
            
            if act_float != 0:
                return abs((pred_float - act_float) / act_float)
            else:
                return abs(pred_float - act_float)
        except (ValueError, TypeError):
            return None
    
    def _update_aggregated_metrics(self, ticker: str, prediction_type: str):
        """
        Actualiza las métricas agregadas para un ticker y tipo de predicción.
        
        Args:
            ticker: Ticker a actualizar
            prediction_type: Tipo de predicción a actualizar
        """
        # Calcular métricas para diferentes ventanas de tiempo
        windows = {
            "daily": 1,
            "weekly": 7,
            "monthly": 30
        }
        
        for window_name, days in windows.items():
            start_date = datetime.utcnow() - timedelta(days=days)
            metrics = self.calculate_accuracy_metrics(ticker, prediction_type, start_date)
            
            # Buscar o crear métrica agregada
            existing = self.db.query(PredictionMetrics).filter(
                PredictionMetrics.ticker == ticker,
                PredictionMetrics.prediction_type == prediction_type,
                PredictionMetrics.time_window == window_name
            ).first()
            
            if existing:
                existing.total_predictions = metrics.total_predictions
                existing.correct_predictions = metrics.correct_predictions
                existing.accuracy_rate = metrics.accuracy_rate
                existing.avg_precision = metrics.precision
                existing.avg_recall = metrics.recall
                existing.avg_f1 = metrics.f1_score
                existing.avg_calibration_error = metrics.calibration_error
                existing.calibration_score = metrics.calibration_score
                existing.last_updated = datetime.utcnow()
            else:
                new_metrics = PredictionMetrics(
                    ticker=ticker,
                    prediction_type=prediction_type,
                    time_window=window_name,
                    total_predictions=metrics.total_predictions,
                    correct_predictions=metrics.correct_predictions,
                    accuracy_rate=metrics.accuracy_rate,
                    avg_precision=metrics.precision,
                    avg_recall=metrics.recall,
                    avg_f1=metrics.f1_score,
                    avg_calibration_error=metrics.calibration_error,
                    calibration_score=metrics.calibration_score
                )
                self.db.add(new_metrics)
        
        self.db.commit()
    
    def get_calibration_report(self, ticker: str, prediction_type: str) -> dict[str, Any]:
        """
        Genera un reporte de calibración del sistema de predicciones.
        
        Args:
            ticker: Ticker a analizar
            prediction_type: Tipo de predicción
            
        Returns:
            Diccionario con métricas de calibración
        """
        # Obtener predicciones evaluadas
        predictions = self.db.query(Prediction).filter(
            Prediction.ticker == ticker,
            Prediction.prediction_type == prediction_type,
            Prediction.outcome.in_([
                PredictionOutcome.CORRECT.value,
                PredictionOutcome.INCORRECT.value
            ])
        ).all()
        
        if not predictions:
            return {
                "ticker": ticker,
                "prediction_type": prediction_type,
                "total_evaluated": 0,
                "calibration_score": 0.0,
                "by_confidence_level": {}
            }
        
        # Agrupar por nivel de confianza
        high_conf = [p for p in predictions if p.confidence_score >= 0.7]
        medium_conf = [p for p in predictions if 0.4 <= p.confidence_score < 0.7]
        low_conf = [p for p in predictions if p.confidence_score < 0.4]
        
        def calculate_group_accuracy(group: list[Prediction]) -> float:
            if not group:
                return 0.0
            correct = sum(1 for p in group if p.outcome == PredictionOutcome.CORRECT.value)
            return correct / len(group)
        
        avg_calibration_error = sum(
            p.calibration_error for p in predictions if p.calibration_error
        ) / len(predictions) if predictions else 0.5
        
        return {
            "ticker": ticker,
            "prediction_type": prediction_type,
            "total_evaluated": len(predictions),
            "calibration_score": 1.0 - avg_calibration_error,
            "average_calibration_error": avg_calibration_error,
            "by_confidence_level": {
                "high": {
                    "count": len(high_conf),
                    "accuracy": calculate_group_accuracy(high_conf),
                    "avg_confidence": sum(p.confidence_score for p in high_conf) / len(high_conf) if high_conf else 0.0
                },
                "medium": {
                    "count": len(medium_conf),
                    "accuracy": calculate_group_accuracy(medium_conf),
                    "avg_confidence": sum(p.confidence_score for p in medium_conf) / len(medium_conf) if medium_conf else 0.0
                },
                "low": {
                    "count": len(low_conf),
                    "accuracy": calculate_group_accuracy(low_conf),
                    "avg_confidence": sum(p.confidence_score for p in low_conf) / len(low_conf) if low_conf else 0.0
                }
            }
        }
