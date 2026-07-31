"""
Router para el sistema de tracking de predicciones.
Expone endpoints para registrar, evaluar y consultar predicciones y sus métricas.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

# Imports opcionales - solo si hay base de datos disponible
try:
    from sqlalchemy.orm import Session
    from app.db.session import get_db
    from app.analytics.prediction_tracker import PredictionTracker, PredictionRecord
    from app.db.prediction_models import PredictionOutcome
    from app.schemas import (
        PredictionCreateIn,
        PredictionOut,
        PredictionEvaluateIn,
        AccuracyMetricsOut,
        CalibrationReportOut,
        PredictionMetricsOut
    )
    
    # Verificar que la base de datos esté accesible
    try:
        from app.db.session import engine
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        DB_AVAILABLE = True
    except Exception as db_error:
        DB_AVAILABLE = False
        print(f"WARNING: Prediction router database not accessible: {db_error}")
        
except ImportError as e:
    DB_AVAILABLE = False
    print(f"WARNING: Prediction router database dependencies not available: {e}")

router = APIRouter()

if not DB_AVAILABLE:
    # Si no hay base de datos, crear un endpoint informativo
    @router.get("/predictions", tags=["predictions"])
    def predictions_not_available():
        raise HTTPException(
            status_code=503,
            detail="Prediction tracking not available - database dependencies missing. Install sqlalchemy and configure PostgreSQL database."
        )
else:

    @router.post("/predictions", response_model=PredictionOut, tags=["predictions"])
    def create_prediction(
        prediction_data: PredictionCreateIn,
        db: Session = Depends(get_db)
    ):
        """
        Registra una nueva predicción en el sistema.
        
        La predicción se almacena con su contexto de mercado y confianza.
        La confianza se ajusta automáticamente basándose en el historial de accuracy.
        """
        try:
            tracker = PredictionTracker(db)
            
            record = PredictionRecord(
                ticker=prediction_data.ticker,
                prediction_type=prediction_data.prediction_type.value,
                prediction_key=prediction_data.prediction_key,
                predicted_value=prediction_data.predicted_value,
                confidence_score=prediction_data.confidence_score,
                reasoning=prediction_data.reasoning,
                spot_price=prediction_data.spot_price,
                expiration=prediction_data.expiration,
                market_regime=prediction_data.market_regime,
                vix_level=prediction_data.vix_level,
                net_gex=prediction_data.net_gex,
                net_dex=prediction_data.net_dex,
                target_evaluation_time=prediction_data.target_evaluation_time
            )
            
            prediction = tracker.record_prediction(record)
            return prediction
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating prediction: {str(e)}")


    @router.get("/predictions/{prediction_id}", response_model=PredictionOut, tags=["predictions"])
    def get_prediction(
        prediction_id: int,
        db: Session = Depends(get_db)
    ):
        """
        Obtiene una predicción específica por su ID.
        """
        from app.db.prediction_models import Prediction
        
        prediction = db.query(Prediction).filter(Prediction.id == prediction_id).first()
        
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found")
        
        return prediction


    @router.post("/predictions/{prediction_id}/evaluate", response_model=PredictionOut, tags=["predictions"])
    def evaluate_prediction(
        prediction_id: int,
        evaluation_data: PredictionEvaluateIn,
        db: Session = Depends(get_db)
    ):
        """
        Evalúa una predicción registrada contra el valor real observado.
        
        Actualiza el outcome de la predicción y calcula métricas de calibración.
        """
        try:
            tracker = PredictionTracker(db)
            
            # Convert string enum to database enum
            outcome_str = evaluation_data.outcome.value if hasattr(evaluation_data.outcome, 'value') else str(evaluation_data.outcome)
            outcome_map = {
                "correct": PredictionOutcome.CORRECT,
                "incorrect": PredictionOutcome.INCORRECT,
                "partial": PredictionOutcome.PARTIAL,
                "pending": PredictionOutcome.PENDING,
                "inconclusive": PredictionOutcome.INCONCLUSIVE
            }
            
            db_outcome = outcome_map.get(outcome_str)
            if not db_outcome:
                raise HTTPException(status_code=400, detail=f"Invalid outcome: {outcome_str}")
            
            prediction = tracker.evaluate_prediction(
                prediction_id=prediction_id,
                actual_value=evaluation_data.actual_value,
                outcome=db_outcome,
                evaluation_method=evaluation_data.evaluation_method,
                notes=evaluation_data.notes
            )
            
            return prediction
            
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error evaluating prediction: {str(e)}")


    @router.get("/predictions", response_model=list[PredictionOut], tags=["predictions"])
    def list_predictions(
        ticker: Optional[str] = Query(None, description="Filter by ticker"),
        prediction_type: Optional[str] = Query(None, description="Filter by prediction type"),
        outcome: Optional[str] = Query(None, description="Filter by outcome"),
        limit: int = Query(50, ge=1, le=100),
        offset: int = Query(0, ge=0),
        db: Session = Depends(get_db)
    ):
        """
        Lista predicciones con filtros opcionales.
        """
        from app.db.prediction_models import Prediction
        
        query = db.query(Prediction)
        
        if ticker:
            query = query.filter(Prediction.ticker == ticker)
        if prediction_type:
            query = query.filter(Prediction.prediction_type == prediction_type)
        if outcome:
            query = query.filter(Prediction.outcome == outcome)
        
        query = query.order_by(Prediction.created_at.desc())
        query = query.limit(limit).offset(offset)
        
        predictions = query.all()
        return predictions


    @router.get("/predictions/pending", response_model=list[PredictionOut], tags=["predictions"])
    def get_pending_predictions(
        ticker: Optional[str] = Query(None, description="Filter by ticker"),
        db: Session = Depends(get_db)
    ):
        """
        Obtiene predicciones pendientes de evaluación.
        """
        tracker = PredictionTracker(db)
        pending = tracker.get_pending_evaluations(ticker=ticker)
        return pending


    @router.get("/predictions/metrics/accuracy", response_model=AccuracyMetricsOut, tags=["predictions"])
    def get_accuracy_metrics(
        ticker: str = Query(..., description="Ticker symbol"),
        prediction_type: str = Query(..., description="Prediction type"),
        days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
        db: Session = Depends(get_db)
    ):
        """
        Calcula métricas de accuracy para un tipo de predicción.
        
        Incluye precision, recall, F1 score y métricas de calibración.
        """
        try:
            tracker = PredictionTracker(db)
            
            start_date = datetime.utcnow() - timedelta(days=days)
            metrics = tracker.calculate_accuracy_metrics(
                ticker=ticker,
                prediction_type=prediction_type,
                start_date=start_date
            )
            
            return metrics
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error calculating accuracy metrics: {str(e)}")


    @router.get("/predictions/metrics/calibration", response_model=CalibrationReportOut, tags=["predictions"])
    def get_calibration_report(
        ticker: str = Query(..., description="Ticker symbol"),
        prediction_type: str = Query(..., description="Prediction type"),
        db: Session = Depends(get_db)
    ):
        """
        Genera un reporte de calibración del sistema de predicciones.
        
        Muestra qué tan bien las confianza predichas se corresponden con la accuracy real.
        """
        try:
            tracker = PredictionTracker(db)
            report = tracker.get_calibration_report(ticker, prediction_type)
            return report
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating calibration report: {str(e)}")


    @router.get("/predictions/metrics/historical", response_model=list[PredictionMetricsOut], tags=["predictions"])
    def get_historical_metrics(
        ticker: str = Query(..., description="Ticker symbol"),
        prediction_type: Optional[str] = Query(None, description="Filter by prediction type"),
        time_window: Optional[str] = Query(None, description="Filter by time window (daily, weekly, monthly)"),
        db: Session = Depends(get_db)
    ):
        """
        Obtiene métricas históricas agregadas del sistema de predicciones.
        """
        from app.db.prediction_models import PredictionMetrics
        
        query = db.query(PredictionMetrics).filter(PredictionMetrics.ticker == ticker)
        
        if prediction_type:
            query = query.filter(PredictionMetrics.prediction_type == prediction_type)
        if time_window:
            query = query.filter(PredictionMetrics.time_window == time_window)
        
        metrics = query.order_by(PredictionMetrics.last_updated.desc()).all()
        return metrics


    @router.post("/predictions/evaluate-pending", tags=["predictions"])
    def trigger_evaluation_job(
        ticker: str = Query(..., description="Ticker symbol"),
        db: Session = Depends(get_db)
    ):
        """
        Trigger manual del job de evaluación de predicciones pendientes.
        
        Este endpoint está diseñado para testing o ejecución manual del job programado.
        """
        try:
            from app.jobs.evaluation_job import MarketCloseEvaluator, EvaluationConfig
            
            config = EvaluationConfig(ticker=ticker)
            evaluator = MarketCloseEvaluator(config)
            evaluator.run_evaluation()
            
            return {
                "status": "success",
                "message": f"Evaluation job completed for {ticker}",
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error running evaluation job: {str(e)}")
