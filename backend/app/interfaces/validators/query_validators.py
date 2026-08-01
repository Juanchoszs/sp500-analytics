from datetime import date, datetime
from typing import Optional
from fastapi import HTTPException, Query
import logging

from app.domain.service.ticker_service import TickerService
from app.providers.base import DataProvider

logger = logging.getLogger("app.validators.query")


class TickerValidator:
    """Validator for ticker parameters."""
    
    @staticmethod
    def validate(ticker: str) -> str:
        """
        Validate and normalize ticker symbol.
        
        Args:
            ticker: Ticker symbol to validate
            
        Returns:
            Normalized ticker symbol
            
        Raises:
            HTTPException: If ticker is invalid
        """
        if not ticker or not isinstance(ticker, str):
            raise HTTPException(status_code=400, detail="Ticker parameter is required and must be a string")
        
        ticker = ticker.strip().upper()
        
        if not ticker:
            raise HTTPException(status_code=400, detail="Ticker cannot be empty")
        
        # Validate ticker is supported
        if not TickerService.validate_ticker(ticker):
            raise HTTPException(status_code=400, detail=f"Ticker '{ticker}' is not supported")
        
        return ticker
    
    @staticmethod
    def normalize_for_options(ticker: str) -> str:
        """Normalize ticker for options data retrieval."""
        validated = TickerValidator.validate(ticker)
        return TickerService.normalize_for_options_data(validated)
    
    @staticmethod
    def normalize_for_index(ticker: str) -> str:
        """Normalize ticker for index data retrieval."""
        validated = TickerValidator.validate(ticker)
        return TickerService.normalize_for_index_data(validated)


class ExpirationValidator:
    """Validator for expiration date parameters."""
    
    @staticmethod
    def validate(
        expiration: Optional[str],
        provider: DataProvider,
        ticker: str
    ) -> date:
        """
        Validate and resolve expiration date.
        
        Args:
            expiration: Expiration string in YYYY-MM-DD format, or None for default
            provider: Data provider to get available expirations
            ticker: Ticker symbol to get expirations for
            
        Returns:
            Resolved expiration date
            
        Raises:
            HTTPException: If expiration is invalid
        """
        # Get available expirations
        expirations = provider.get_expirations(ticker)
        
        if not expirations:
            raise HTTPException(
                status_code=404,
                detail=f"No expirations available for ticker '{ticker}'"
            )
        
        # If no expiration provided, return the nearest one
        if expiration is None:
            return expirations[0]
        
        # Parse expiration string
        try:
            target = datetime.strptime(expiration, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Expiration parameter must be in YYYY-MM-DD format"
            )
        
        # Check if expiration is available
        if target not in expirations:
            available_str = ", ".join(exp.strftime("%Y-%m-%d") for exp in expirations[:5])
            if len(expirations) > 5:
                available_str += f", ... ({len(expirations)} total)"
            
            raise HTTPException(
                status_code=404,
                detail=f"Expiration '{expiration}' is not available for ticker '{ticker}'. "
                       f"Available expirations: {available_str}"
            )
        
        return target


class QueryValidator:
    """Composite validator for query parameters."""
    
    @staticmethod
    def validate_intelligence_query(
        ticker: str,
        expiration: Optional[str],
        provider: DataProvider
    ) -> tuple[str, date]:
        """
        Validate parameters for intelligence query endpoints.
        
        Args:
            ticker: Ticker symbol
            expiration: Expiration string or None
            provider: Data provider
            
        Returns:
            Tuple of (normalized_ticker, resolved_expiration)
        """
        # Validate and normalize ticker
        normalized_ticker = TickerValidator.normalize_for_options(ticker)
        
        # Validate and resolve expiration
        resolved_expiration = ExpirationValidator.validate(
            expiration,
            provider,
            normalized_ticker
        )
        
        return normalized_ticker, resolved_expiration
    
    @staticmethod
    def validate_exposure_query(
        ticker: str,
        expiration: Optional[str],
        provider: DataProvider
    ) -> tuple[str, date]:
        """
        Validate parameters for exposure query endpoints.
        
        Args:
            ticker: Ticker symbol
            expiration: Expiration string or None
            provider: Data provider
            
        Returns:
            Tuple of (normalized_ticker, resolved_expiration)
        """
        return QueryValidator.validate_intelligence_query(ticker, expiration, provider)
    
    @staticmethod
    def validate_chart_types(chart_types: str) -> list[str]:
        """
        Validate and parse chart types parameter.
        
        Args:
            chart_types: Comma-separated string of chart types
            
        Returns:
            List of validated chart types
            
        Raises:
            HTTPException: If chart types are invalid
        """
        valid_types = {"gex", "dex", "oi", "volume", "delta_exposure", "gamma_exposure"}
        
        if not chart_types:
            return ["gex", "dex"]  # Default chart types
        
        types_list = [ct.strip().lower() for ct in chart_types.split(",") if ct.strip()]
        
        invalid_types = [ct for ct in types_list if ct not in valid_types]
        if invalid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid chart types: {', '.join(invalid_types)}. "
                       f"Valid types: {', '.join(sorted(valid_types))}"
            )
        
        return types_list
