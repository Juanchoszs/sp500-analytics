from abc import ABC, abstractmethod
from datetime import date
from typing import Optional, List
from app.domain.model.market import ExposureReport, OptionQuote
from app.providers.base import OptionsChain


class MarketRepository(ABC):
    """Repository interface for market data operations."""
    
    @abstractmethod
    def get_options_chain(self, ticker: str, expiration: date) -> OptionsChain:
        """Retrieve options chain for a given ticker and expiration."""
        pass
    
    @abstractmethod
    def get_exposure_report(self, ticker: str, expiration: date) -> ExposureReport:
        """Retrieve or compute exposure report for a given ticker and expiration."""
        pass
    
    @abstractmethod
    def cache_exposure_report(self, report: ExposureReport) -> None:
        """Cache an exposure report for future use."""
        pass
    
    @abstractmethod
    def get_cached_exposure_report(self, ticker: str, expiration: date) -> Optional[ExposureReport]:
        """Retrieve cached exposure report if available."""
        pass
    
    @abstractmethod
    def get_vix_data(self) -> dict:
        """Retrieve VIX data including current value and historical values."""
        pass
    
    @abstractmethod
    def get_historical_data(self, ticker: str, period: str, interval: str) -> dict:
        """Retrieve historical price data for a ticker."""
        pass
