"""
Helper functions for routers.
"""
from app.analytics.index_converter import calculate_index_ratio
from app.providers.base import DataProvider
from loguru import logger
from typing import Any


def enrich_with_index_data(
    response_dict: dict[str, Any], 
    ticker: str, 
    spot: float, 
    provider: DataProvider
) -> dict[str, Any]:
    """
    Enrich response dictionary with index price and ratio if ticker is SPY.
    
    This function encapsulates the common pattern of fetching ^GSPC index data
    and adding it to API responses for SPY ticker requests.
    
    Args:
        response_dict: The response dictionary to enrich
        ticker: The ticker symbol (e.g., "SPY")
        spot: The current spot price
        provider: The data provider instance
        
    Returns:
        The enriched response dictionary
    """
    if ticker != "SPY":
        return response_dict
    
    try:
        index_price = provider.get_index_price("^GSPC")
        if index_price and spot > 0:
            ratio = calculate_index_ratio(spot, index_price)
            response_dict["index_ticker"] = "^GSPC"
            response_dict["index_price"] = index_price
            response_dict["index_ratio"] = ratio
            
            # Add spot_price_index if spot_price exists in response
            if "spot_price" in response_dict:
                response_dict["spot_price_index"] = spot * ratio
    except Exception as e:
        logger.exception("Failed to fetch index_price for %s: %s", ticker, e)
    
    return response_dict
