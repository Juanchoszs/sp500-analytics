from app.domain.model.ticker import TickerConverter, TICKER_MAPPINGS


class TickerService:
    """Service for ticker conversion and normalization operations."""
    
    @staticmethod
    def normalize_for_options_data(ticker: str) -> str:
        """
        Normalize ticker for options data retrieval.
        Options data is typically available on ETFs (e.g., SPY) rather than indices (e.g., ^GSPC).
        
        Args:
            ticker: Input ticker symbol
            
        Returns:
            ETF-equivalent ticker symbol suitable for options data
        """
        return TickerConverter.normalize_ticker(ticker, prefer_etf=True)
    
    @staticmethod
    def normalize_for_index_data(ticker: str) -> str:
        """
        Normalize ticker for index data retrieval.
        Some historical data is better retrieved from indices (e.g., ^GSPC) rather than ETFs.
        
        Args:
            ticker: Input ticker symbol
            
        Returns:
            Index-equivalent ticker symbol suitable for index data
        """
        return TickerConverter.normalize_ticker(ticker, prefer_etf=False)
    
    @staticmethod
    def is_index_ticker(ticker: str) -> bool:
        """Check if ticker is an index (starts with ^)."""
        return TickerConverter.is_index_ticker(ticker)
    
    @staticmethod
    def get_etf_equivalent(ticker: str) -> str:
        """Get ETF equivalent for an index ticker."""
        return TickerConverter.get_etf_equivalent(ticker)
    
    @staticmethod
    def get_index_equivalent(ticker: str) -> str:
        """Get index equivalent for an ETF ticker."""
        return TickerConverter.get_index_equivalent(ticker)
    
    @staticmethod
    def get_supported_tickers() -> list[str]:
        """Get list of supported ticker mappings."""
        return list(TICKER_MAPPINGS.keys()) + [m.etf_ticker for m in TICKER_MAPPINGS.values()]
    
    @staticmethod
    def validate_ticker(ticker: str) -> bool:
        """
        Validate if ticker is supported or can be used as-is.
        
        Args:
            ticker: Ticker symbol to validate
            
        Returns:
            True if ticker is supported or can be used as-is
        """
        # Check if it's in our mappings
        if ticker in TICKER_MAPPINGS:
            return True
        # Check if it's an ETF in our mappings
        for mapping in TICKER_MAPPINGS.values():
            if mapping.etf_ticker == ticker:
                return True
        # If not in mappings, assume it's valid (could be other tickers)
        return True
