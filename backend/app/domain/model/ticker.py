from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class TickerMapping:
    """Mapping between index and ETF tickers."""
    index_ticker: str  # e.g., "^GSPC" for S&P 500
    etf_ticker: str  # e.g., "SPY" for SPDR S&P 500 ETF
    name: str


# Common ticker mappings
TICKER_MAPPINGS = {
    "^GSPC": TickerMapping(
        index_ticker="^GSPC",
        etf_ticker="SPY",
        name="S&P 500 Index / SPDR ETF"
    ),
    "^DJI": TickerMapping(
        index_ticker="^DJI",
        etf_ticker="DIA",
        name="Dow Jones Industrial Average / SPDR Dow ETF"
    ),
    "^IXIC": TickerMapping(
        index_ticker="^IXIC",
        etf_ticker="QQQ",
        name="NASDAQ Composite / Invesco QQQ ETF"
    ),
    "^RUT": TickerMapping(
        index_ticker="^RUT",
        etf_ticker="IWM",
        name="Russell 2000 Index / iShares Russell 2000 ETF"
    ),
}


class TickerConverter:
    """Utility for converting between index and ETF tickers."""
    
    @staticmethod
    def is_index_ticker(ticker: str) -> bool:
        """Check if ticker is an index (starts with ^)."""
        return ticker.startswith("^")
    
    @staticmethod
    def get_etf_equivalent(ticker: str) -> str:
        """Get ETF equivalent for an index ticker."""
        mapping = TICKER_MAPPINGS.get(ticker)
        if mapping:
            return mapping.etf_ticker
        # If it's already an ETF or not in mappings, return as-is
        return ticker
    
    @staticmethod
    def get_index_equivalent(ticker: str) -> str:
        """Get index equivalent for an ETF ticker."""
        for mapping in TICKER_MAPPINGS.values():
            if mapping.etf_ticker == ticker:
                return mapping.index_ticker
        # If it's already an index or not in mappings, return as-is
        return ticker
    
    @staticmethod
    def normalize_ticker(ticker: str, prefer_etf: bool = True) -> str:
        """
        Normalize ticker to preferred format.
        
        Args:
            ticker: Input ticker symbol
            prefer_etf: If True, convert index to ETF. If False, convert ETF to index.
        
        Returns:
            Normalized ticker symbol
        """
        if prefer_etf:
            return TickerConverter.get_etf_equivalent(ticker)
        else:
            return TickerConverter.get_index_equivalent(ticker)
    
    @staticmethod
    def get_mapping(ticker: str) -> Optional[TickerMapping]:
        """Get ticker mapping if available."""
        # Check if ticker is an index
        if ticker in TICKER_MAPPINGS:
            return TICKER_MAPPINGS[ticker]
        # Check if ticker is an ETF
        for mapping in TICKER_MAPPINGS.values():
            if mapping.etf_ticker == ticker:
                return mapping
        return None
