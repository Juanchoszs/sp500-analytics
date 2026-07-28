"""
Puerto (en el sentido de arquitectura hexagonal) que define el contrato
que cualquier proveedor de datos de opciones debe cumplir.

La lógica de negocio (greeks, GEX/DEX, max pain, walls...) SOLO conoce
estos tipos y esta interfaz. Nunca importa `yfinance` directamente.
Esto es lo que permite reemplazar Yahoo por Polygon, ORATS o Theta Data
cambiando una sola línea en app/providers/__init__.py.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from typing import Any



@dataclass
class OptionQuote:
    strike: float
    bid: float
    ask: float
    last_price: float
    volume: int
    open_interest: int
    implied_volatility: float
    contract_type: str  # "call" | "put"
    in_the_money: bool


@dataclass
class OptionsChain:
    underlying: str
    expiration: date
    spot_price: float
    calls: list[OptionQuote]
    puts: list[OptionQuote]
    fetched_at: str  # ISO timestamp, para trazabilidad de la caché


class DataProvider(ABC):
    """Contrato que debe implementar cualquier proveedor de mercado."""

    @abstractmethod
    def get_spot_price(self, ticker: str) -> float:
        ...

    @abstractmethod
    def get_expirations(self, ticker: str) -> list[date]:
        ...

    @abstractmethod
    def get_options_chain(self, ticker: str, expiration: date) -> OptionsChain:
        ...

    @abstractmethod
    def get_vix_data(self) -> dict[str, Any]:
        """Devuelve el precio actual del VIX y el histórico de cierres para percentil/rank."""
        ...

    @abstractmethod
    def get_index_price(self, index_ticker: str) -> float:
        """Obtiene el precio de un índice (ej: ^GSPC, ^NDX)"""
        ...

    @abstractmethod
    def get_yield_data(self) -> dict[str, Any]:
        """Obtiene rendimientos del tesoro e indicadores de crédito corporativo."""
        ...


