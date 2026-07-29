"""
Punto único de selección de proveedor. Todo el resto del backend pide
`get_provider()` y recibe un objeto que cumple `DataProvider`; no le
importa si por debajo hay Yahoo, Polygon, ORATS o Theta Data.

Para migrar de proveedor en el futuro:
  1. Crear app/infrastructure/adapters/polygon_adapter.py implementando DataProvider.
  2. Agregar la rama correspondiente aquí.
  3. Cambiar settings.data_provider="polygon" en .env.
Cero cambios en analytics/, routers/ ni greeks/.
"""
from app.config import settings
from app.providers.base import DataProvider
from app.infrastructure.adapters.yahoo_adapter import YahooFinanceAdapter

_provider_instance: DataProvider | None = None


def get_provider() -> DataProvider:
    global _provider_instance
    if _provider_instance is None:
        if settings.data_provider == "yahoo":
            _provider_instance = YahooFinanceAdapter()
        else:
            raise NotImplementedError(
                f"Proveedor '{settings.data_provider}' no implementado todavía. "
                f"Implementa DataProvider en app/infrastructure/adapters/{settings.data_provider}_adapter.py"
            )
    return _provider_instance


def get_provider_dependency() -> DataProvider:
    """FastAPI dependency for injecting the DataProvider."""
    return get_provider()
