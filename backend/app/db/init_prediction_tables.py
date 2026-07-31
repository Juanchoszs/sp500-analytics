"""
Script de inicialización de tablas de predicciones.
Crea las tablas necesarias para el sistema de tracking de predicciones en la base de datos.
"""
from app.db.prediction_models import Base
from app.db.session import engine


def init_prediction_tables():
    """
    Inicializa las tablas de predicciones en la base de datos.
    """
    print("Creando tablas de predicciones...")
    
    try:
        Base.metadata.create_all(bind=engine)
        print("✓ Tablas de predicciones creadas exitosamente")
        print("  - predictions")
        print("  - prediction_evaluations")
        print("  - prediction_metrics")
    except Exception as e:
        print(f"✗ Error creando tablas: {e}")
        raise


if __name__ == "__main__":
    init_prediction_tables()
