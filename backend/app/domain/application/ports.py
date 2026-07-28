from abc import ABC, abstractmethod
from datetime import date
from typing import List, Optional, Tuple
from app.domain.model.market import OptionQuote


class MarketDataProviderPort(ABC):
    """Port for market data providers."""

    @abstractmethod
    def get_spot_price(self, ticker: str) -> float:
        raise NotImplementedError

    @abstractmethod
    def get_expirations(self, ticker: str) -> List[date]:
        raise NotImplementedError

    @abstractmethod
    def get_options_chain(self, ticker: str, expiration: date) -> Tuple[List[OptionQuote], List[OptionQuote], float]:
        """Returns (calls, puts, spot_price)."""
        raise NotImplementedError
