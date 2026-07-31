"""
Módulo de base de datos.
Incluye modelos de persistencia para exposición de opciones y predicciones.
"""
from app.db.models import Base, ExposureSnapshot

# Import de modelos de predicciones opcional
try:
    from app.db.prediction_models import (
        Prediction,
        PredictionEvaluation,
        PredictionMetrics,
        PredictionType,
        PredictionOutcome
    )
    PREDICTION_MODELS_AVAILABLE = True
except ImportError:
    PREDICTION_MODELS_AVAILABLE = False
    Prediction = None
    PredictionEvaluation = None
    PredictionMetrics = None
    PredictionType = None
    PredictionOutcome = None

__all__ = [
    "Base",
    "ExposureSnapshot",
    "Prediction",
    "PredictionEvaluation", 
    "PredictionMetrics",
    "PredictionType",
    "PredictionOutcome",
    "PREDICTION_MODELS_AVAILABLE"
]
