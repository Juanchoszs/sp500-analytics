"""
Modelos de persistencia para el sistema de tracking de predicciones.
Estos modelos permiten almacenar, evaluar y mejorar la calidad de las predicciones
del sistema de inteligencia cuantitativa a lo largo del tiempo.
"""
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class PredictionType(str, Enum):
    """Tipos de predicciones que el sistema puede generar."""
    DIRECTIONAL = "directional"  # Predicción de dirección (alcista/bajista)
    VOLATILITY = "volatility"    # Predicción de nivel de volatilidad
    REGIME = "regime"            # Predicción de régimen de mercado
    PRICE_TARGET = "price_target" # Predicción de objetivo de precio
    SCENARIO = "scenario"        # Predicción de escenario específico


class PredictionOutcome(str, Enum):
    """Resultados posibles de una predicción evaluada."""
    CORRECT = "correct"
    INCORRECT = "incorrect"
    PARTIAL = "partial"
    PENDING = "pending"
    INCONCLUSIVE = "inconclusive"


class Prediction(Base):
    """
    Modelo principal para almacenar predicciones del sistema.
    Cada predicción se registra con su contexto, confianza y resultado posterior.
    """
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Identificación y contexto
    ticker = Column(String(10), nullable=False, index=True)
    prediction_type = Column(String(50), nullable=False, index=True)
    prediction_key = Column(String(100), nullable=False, index=True)  # Clave única para identificar la predicción
    
    # Contenido de la predicción
    predicted_value = Column(String(500), nullable=False)  # Valor predicho (puede ser texto o numérico serializado)
    confidence_score = Column(Float, nullable=False)  # 0.0 a 1.0
    reasoning = Column(Text, nullable=True)  # Explicación de la predicción
    
    # Contexto de mercado en el momento de la predicción
    spot_price = Column(Float, nullable=False)
    expiration = Column(String(50), nullable=True)  # Vencimiento de opciones si aplica
    market_regime = Column(String(50), nullable=True)
    vix_level = Column(Float, nullable=True)
    net_gex = Column(Float, nullable=True)
    net_dex = Column(Float, nullable=True)
    
    # Metadatos de tiempo
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    target_evaluation_time = Column(DateTime, nullable=True, index=True)  # Cuándo debe evaluarse
    evaluated_at = Column(DateTime, nullable=True, index=True)
    
    # Resultado de la evaluación
    outcome = Column(String(50), nullable=True, index=True)
    actual_value = Column(String(500), nullable=True)  # Valor real observado
    error_margin = Column(Float, nullable=True)  # Diferencia entre predicho y real si aplica
    evaluation_notes = Column(Text, nullable=True)
    
    # Métricas de calibración
    confidence_adjusted = Column(Float, nullable=True)  # Confianza ajustada por historial
    calibration_error = Column(Float, nullable=True)  # Error de calibración
    
    # Relaciones
    evaluations = relationship("PredictionEvaluation", back_populates="prediction", cascade="all, delete-orphan")


class PredictionEvaluation(Base):
    """
    Evaluaciones detalladas de predicciones.
    Permite análisis más profundos y múltiples métricas por predicción.
    """
    __tablename__ = "prediction_evaluations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=False, index=True)
    
    # Métricas de accuracy
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    
    # Métricas de calibración
    expected_confidence = Column(Float, nullable=True)
    observed_accuracy = Column(Float, nullable=True)
    calibration_score = Column(Float, nullable=True)
    
    # Contexto de evaluación
    evaluation_method = Column(String(50), nullable=False)  # Cómo se evaluó
    evaluation_horizon = Column(String(50), nullable=True)  # Horizonte de tiempo
    market_conditions = Column(Text, nullable=True)  # Condiciones de mercado al evaluar
    
    # Metadatos
    evaluated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    notes = Column(Text, nullable=True)
    
    # Relación
    prediction = relationship("Prediction", back_populates="evaluations")


class PredictionMetrics(Base):
    """
    Métricas agregadas del sistema de predicciones.
    Almacena estadísticas históricas para análisis de rendimiento.
    """
    __tablename__ = "prediction_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Agrupación
    ticker = Column(String(10), nullable=False, index=True)
    prediction_type = Column(String(50), nullable=False, index=True)
    time_window = Column(String(50), nullable=False, index=True)  # "daily", "weekly", "monthly"
    
    # Métricas de accuracy
    total_predictions = Column(Integer, nullable=False, default=0)
    correct_predictions = Column(Integer, nullable=False, default=0)
    accuracy_rate = Column(Float, nullable=False, default=0.0)
    
    # Métricas detalladas
    avg_precision = Column(Float, nullable=True)
    avg_recall = Column(Float, nullable=True)
    avg_f1 = Column(Float, nullable=True)
    
    # Métricas de calibración
    avg_confidence = Column(Float, nullable=True)
    avg_calibration_error = Column(Float, nullable=True)
    calibration_score = Column(Float, nullable=True)
    
    # Desglose por nivel de confianza
    high_conf_accuracy = Column(Float, nullable=True)  # Predicciones con confianza > 0.7
    medium_conf_accuracy = Column(Float, nullable=True)  # Predicciones con confianza 0.4-0.7
    low_conf_accuracy = Column(Float, nullable=True)  # Predicciones con confianza < 0.4
    
    # Tendencias
    improving_trend = Column(Float, nullable=True)  # Tasa de mejora
    last_updated = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f"<PredictionMetrics(ticker={self.ticker}, type={self.prediction_type}, window={self.time_window}, accuracy={self.accuracy_rate:.2f})>"
