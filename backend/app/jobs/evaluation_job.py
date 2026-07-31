"""
Job programado para evaluación automática de predicciones al cierre del mercado.
Este sistema evalúa automáticamente las predicciones pendientes basándose en
los datos de mercado reales al cierre de la sesión.
"""
import logging
from datetime import datetime, time
from typing import Optional
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.analytics.prediction_tracker import PredictionTracker
from app.db.prediction_models import Prediction, PredictionOutcome
from app.providers.base import DataProvider
from app.infrastructure.adapters.yahoo_adapter import YahooAdapter


# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class EvaluationConfig:
    """Configuración para el job de evaluación."""
    ticker: str = "SPY"
    market_close_time: time = time(16, 0)  # 4:00 PM EST
    evaluation_horizon_hours: int = 24  # Horas después de la predicción para evaluar
    min_confidence_threshold: float = 0.3  # Confianza mínima para evaluar


class MarketCloseEvaluator:
    """
    Evaluador automático de predicciones al cierre del mercado.
    Identifica predicciones pendientes y las evalúa contra datos reales.
    """
    
    def __init__(self, config: Optional[EvaluationConfig] = None):
        self.config = config or EvaluationConfig()
        self.data_provider: Optional[DataProvider] = None
        self.db: Optional[Session] = None
        self.tracker: Optional[PredictionTracker] = None
    
    def initialize(self):
        """Inicializa los componentes necesarios para la evaluación."""
        try:
            # Inicializar conexión a base de datos
            self.db = SessionLocal()
            
            # Inicializar tracker de predicciones
            self.tracker = PredictionTracker(self.db)
            
            # Inicializar provider de datos
            self.data_provider = YahooAdapter()
            
            logger.info("MarketCloseEvaluator inicializado correctamente")
        except Exception as e:
            logger.error(f"Error al inicializar MarketCloseEvaluator: {e}")
            raise
    
    def cleanup(self):
        """Limpia recursos."""
        if self.db:
            self.db.close()
        logger.info("Recursos limpiados correctamente")
    
    def is_market_close(self) -> bool:
        """
        Verifica si es hora de cierre del mercado.
        
        Returns:
            True si es hora de evaluar predicciones
        """
        now = datetime.utcnow()
        # Convertir a hora del mercado (EST aprox UTC-5)
        market_time = (now.hour - 5) % 24
        
        # Ventana de 30 minutos alrededor del cierre
        return abs(market_time - self.config.market_close_time.hour) < 0.5
    
    def evaluate_directional_prediction(
        self, 
        prediction: Prediction, 
        current_price: float
    ) -> tuple[PredictionOutcome, str]:
        """
        Evalúa una predicción direccional (alcista/bajista).
        
        Args:
            prediction: Predicción a evaluar
            current_price: Precio actual del mercado
            
        Returns:
            Tupla con (outcome, justificación)
        """
        predicted_direction = prediction.predicted_value.lower()
        original_price = prediction.spot_price
        
        if original_price is None:
            return PredictionOutcome.INCONCLUSIVE, "No hay precio original registrado"
        
        price_change = (current_price - original_price) / original_price
        
        # Determinar dirección real
        if price_change > 0.005:  # > 0.5% cambio positivo
            actual_direction = "bullish"
        elif price_change < -0.005:  # < -0.5% cambio negativo
            actual_direction = "bearish"
        else:
            actual_direction = "neutral"
        
        # Evaluar predicción
        if predicted_direction == actual_direction:
            return PredictionOutcome.CORRECT, f"Dirección correcta: {actual_direction} (cambio {price_change:.2%})"
        elif predicted_direction in ["bullish", "bearish"] and actual_direction == "neutral":
            return PredictionOutcome.PARTIAL, f"Predicción {predicted_direction} pero mercado neutral (cambio {price_change:.2%})"
        else:
            return PredictionOutcome.INCORRECT, f"Dirección incorrecta: predicho {predicted_direction}, real {actual_direction}"
    
    def evaluate_volatility_prediction(
        self,
        prediction: Prediction,
        current_vix: Optional[float]
    ) -> tuple[PredictionOutcome, str]:
        """
        Evalúa una predicción de volatilidad.
        
        Args:
            prediction: Predicción a evaluar
            current_vix: Valor actual del VIX
            
        Returns:
            Tupla con (outcome, justificación)
        """
        if current_vix is None:
            return PredictionOutcome.INCONCLUSIVE, "No hay datos de VIX disponibles"
        
        predicted_level = prediction.predicted_value.lower()
        original_vix = prediction.vix_level
        
        if original_vix is None:
            return PredictionOutcome.INCONCLUSIVE, "No hay VIX original registrado"
        
        # Clasificar nivel actual
        if current_vix < 14:
            actual_level = "low"
        elif current_vix < 20:
            actual_level = "normal"
        else:
            actual_level = "high"
        
        # Evaluar predicción
        if predicted_level == actual_level:
            return PredictionOutcome.CORRECT, f"Nivel de volatilidad correcto: {actual_level} (VIX {current_vix:.2f})"
        elif (predicted_level in ["low", "high"] and actual_level == "normal") or \
             (predicted_level == "normal" and actual_level in ["low", "high"]):
            return PredictionOutcome.PARTIAL, f"Predicción {predicted_level} pero volatilidad {actual_level} (VIX {current_vix:.2f})"
        else:
            return PredictionOutcome.INCORRECT, f"Nivel incorrecto: predicho {predicted_level}, real {actual_level}"
    
    def evaluate_regime_prediction(
        self,
        prediction: Prediction,
        current_gex: Optional[float],
        current_dex: Optional[float]
    ) -> tuple[PredictionOutcome, str]:
        """
        Evalúa una predicción de régimen de mercado.
        
        Args:
            prediction: Predicción a evaluar
            current_gex: Gamma exposure actual
            current_dex: Delta exposure actual
            
        Returns:
            Tupla con (outcome, justificación)
        """
        if current_gex is None or current_dex is None:
            return PredictionOutcome.INCONCLUSIVE, "No hay datos de exposición disponibles"
        
        predicted_regime = prediction.predicted_value.lower()
        
        # Determinar régimen actual
        if current_gex > 0:
            actual_regime = "long_gamma"
        else:
            actual_regime = "short_gamma"
        
        # Evaluar predicción
        if predicted_regime == actual_regime:
            return PredictionOutcome.CORRECT, f"Régimen correcto: {actual_regime} (GEX {current_gex:,.0f})"
        else:
            return PredictionOutcome.INCORRECT, f"Régimen incorrecto: predicho {predicted_regime}, real {actual_regime}"
    
    def evaluate_price_target(
        self,
        prediction: Prediction,
        current_price: float
    ) -> tuple[PredictionOutcome, str]:
        """
        Evalúa una predicción de objetivo de precio.
        
        Args:
            prediction: Predicción a evaluar
            current_price: Precio actual del mercado
            
        Returns:
            Tupla con (outcome, justificación)
        """
        try:
            target_price = float(prediction.predicted_value)
            original_price = prediction.spot_price
            
            if original_price is None:
                return PredictionOutcome.INCONCLUSIVE, "No hay precio original registrado"
            
            # Calcular si el precio alcanzó el objetivo
            if original_price < target_price <= current_price:
                return PredictionOutcome.CORRECT, f"Objetivo alcanzado: ${target_price:.2f} (precio actual ${current_price:.2f})"
            elif original_price > target_price >= current_price:
                return PredictionOutcome.CORRECT, f"Objetivo alcanzado: ${target_price:.2f} (precio actual ${current_price:.2f})"
            else:
                # Calcular qué tan cerca estuvo
                distance_pct = abs(current_price - target_price) / target_price
                if distance_pct < 0.02:  # Dentro del 2%
                    return PredictionOutcome.PARTIAL, f"Cercano al objetivo: ${target_price:.2f} vs ${current_price:.2f} ({distance_pct:.1%})"
                else:
                    return PredictionOutcome.INCORRECT, f"Objetivo no alcanzado: ${target_price:.2f} vs ${current_price:.2f}"
        except (ValueError, TypeError):
            return PredictionOutcome.INCONCLUSIVE, "Valor de objetivo inválido"
    
    def run_evaluation(self):
        """
        Ejecuta el ciclo completo de evaluación de predicciones pendientes.
        """
        try:
            self.initialize()
            
            logger.info("Iniciando evaluación de predicciones pendientes")
            
            # Obtener predicciones pendientes
            pending_predictions = self.tracker.get_pending_evaluations(
                ticker=self.config.ticker
            )
            
            if not pending_predictions:
                logger.info("No hay predicciones pendientes para evaluar")
                return
            
            logger.info(f"Found {len(pending_predictions)} pending predictions to evaluate")
            
            # Obtener datos de mercado actuales
            try:
                current_data = self.data_provider.get_price(self.config.ticker)
                current_price = current_data.get("price")
                
                # Intentar obtener VIX
                try:
                    vix_data = self.data_provider.get_price("^VIX")
                    current_vix = vix_data.get("price")
                except:
                    current_vix = None
                
                logger.info(f"Datos de mercado obtenidos: Precio ${current_price}, VIX {current_vix}")
                
            except Exception as e:
                logger.error(f"Error obteniendo datos de mercado: {e}")
                return
            
            # Evaluar cada predicción
            evaluated_count = 0
            for prediction in pending_predictions:
                try:
                    # Filtrar por confianza mínima
                    if prediction.confidence_score < self.config.min_confidence_threshold:
                        logger.debug(f"Predicción {prediction.id} por debajo del umbral de confianza")
                        continue
                    
                    # Seleccionar método de evaluación según tipo
                    outcome = PredictionOutcome.INCONCLUSIVE
                    notes = ""
                    
                    if prediction.prediction_type == "directional":
                        outcome, notes = self.evaluate_directional_prediction(
                            prediction, current_price
                        )
                    elif prediction.prediction_type == "volatility":
                        outcome, notes = self.evaluate_volatility_prediction(
                            prediction, current_vix
                        )
                    elif prediction.prediction_type == "regime":
                        # Necesitaríamos datos de exposición actuales
                        outcome, notes = self.evaluate_regime_prediction(
                            prediction, None, None
                        )
                    elif prediction.prediction_type == "price_target":
                        outcome, notes = self.evaluate_price_target(
                            prediction, current_price
                        )
                    else:
                        notes = f"Tipo de predicción {prediction.prediction_type} no soportado para evaluación automática"
                    
                    # Actualizar predicción
                    self.tracker.evaluate_prediction(
                        prediction_id=prediction.id,
                        actual_value=str(current_price) if prediction.prediction_type in ["directional", "price_target"] else str(current_vix) if prediction.prediction_type == "volatility" else "N/A",
                        outcome=outcome,
                        evaluation_method="automatic_market_close",
                        notes=notes
                    )
                    
                    evaluated_count += 1
                    logger.info(f"Predicción {prediction.id} evaluada: {outcome.value} - {notes}")
                    
                except Exception as e:
                    logger.error(f"Error evaluando predicción {prediction.id}: {e}")
                    continue
            
            logger.info(f"Evaluación completada: {evaluated_count}/{len(pending_predictions)} predicciones evaluadas")
            
            # Generar reporte de calibración
            calibration_report = self.tracker.get_calibration_report(
                self.config.ticker,
                "directional"
            )
            logger.info(f"Reporte de calibración: {calibration_report}")
            
        except Exception as e:
            logger.error(f"Error en ejecución de evaluación: {e}")
            raise
        finally:
            self.cleanup()


def run_scheduled_evaluation():
    """
    Entry point para ejecutar el job de evaluación.
    Puede ser llamado por un scheduler como APScheduler o cron.
    """
    evaluator = MarketCloseEvaluator()
    evaluator.run_evaluation()


if __name__ == "__main__":
    # Ejecutar evaluación directamente para testing
    run_scheduled_evaluation()
