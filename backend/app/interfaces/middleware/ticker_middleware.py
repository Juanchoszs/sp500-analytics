from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import logging

from app.domain.service.ticker_service import TickerService

logger = logging.getLogger("app.middleware.ticker")


class TickerMiddleware(BaseHTTPMiddleware):
    """
    Middleware for automatic ticker normalization.
    
    This middleware automatically converts index tickers (e.g., ^GSPC) to their
    ETF equivalents (e.g., SPY) for options data retrieval, and vice versa for
    index data retrieval.
    """
    
    def __init__(self, app, prefer_etf: bool = True):
        super().__init__(app)
        self.prefer_etf = prefer_etf
    
    async def dispatch(self, request: Request, call_next: Callable):
        """
        Process request and normalize ticker parameters.
        
        This middleware intercepts requests and normalizes ticker parameters
        based on the endpoint type (options data vs index data).
        """
        # Get ticker from query parameters
        ticker = request.query_params.get("ticker")
        
        if ticker:
            # Determine if this is an options-related endpoint
            path = request.url.path
            is_options_endpoint = any(
                keyword in path.lower()
                for keyword in ["options", "gex", "dex", "exposure", "intelligence", "gamma", "delta"]
            )
            
            # Normalize ticker based on endpoint type
            if is_options_endpoint:
                # For options data, prefer ETF (SPY over ^GSPC)
                normalized = TickerService.normalize_for_options_data(ticker)
                if normalized != ticker:
                    logger.debug(f"Normalized ticker from {ticker} to {normalized} for options endpoint")
                    # Update query params
                    request.state.original_ticker = ticker
                    request.state.normalized_ticker = normalized
            else:
                # For index data, prefer index (^GSPC over SPY)
                normalized = TickerService.normalize_for_index_data(ticker)
                if normalized != ticker:
                    logger.debug(f"Normalized ticker from {ticker} to {normalized} for index endpoint")
                    request.state.original_ticker = ticker
                    request.state.normalized_ticker = normalized
        
        response = await call_next(request)
        return response


def get_normalized_ticker(request: Request) -> str:
    """
    Helper function to get the normalized ticker from request state.
    
    This can be used in endpoints to access the ticker that was normalized
    by the middleware.
    """
    if hasattr(request.state, "normalized_ticker"):
        return request.state.normalized_ticker
    # Fallback to query parameter
    return request.query_params.get("ticker", "")


def get_original_ticker(request: Request) -> str:
    """
    Helper function to get the original ticker from request state.
    
    This can be used in endpoints to access the ticker that was originally
    provided by the client before normalization.
    """
    if hasattr(request.state, "original_ticker"):
        return request.state.original_ticker
    # Fallback to query parameter
    return request.query_params.get("ticker", "")
