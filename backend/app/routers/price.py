from datetime import datetime, timezone, date
from fastapi import APIRouter, Query, Depends
from app.config import settings
from app.providers import get_provider_dependency
from app.providers.base import DataProvider
from app.schemas import ExpirationsResponse
from app.routers.helpers import enrich_with_index_data
from app.analytics.index_converter import calculate_index_ratio
import logging

logger = logging.getLogger("app.routers.price")
router = APIRouter()


@router.get("/price")
def get_price(
    ticker: str = Query(default=settings.default_ticker),
    index_ticker: str | None = Query(default=None, description="Ticker del índice de referencia (ej: GSPC)"),
    provider: DataProvider = Depends(get_provider_dependency)
):
    price = provider.get_spot_price(ticker)
    
    response = {
        "ticker": ticker,
        "price": price,
        "fetched_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Handle custom index_ticker parameter if provided
    if index_ticker:
        index_ticker_formatted = index_ticker if index_ticker.startswith("^") else f"^{index_ticker}"
        try:
            index_price = provider.get_index_price(index_ticker_formatted)
            response["index_price"] = index_price
            response["index_ticker"] = index_ticker_formatted
            if ticker == "SPY" and index_ticker_formatted == "^GSPC" and price > 0:
                ratio = calculate_index_ratio(price, index_price)
                response["index_ratio"] = ratio
        except Exception as e:
            logger.exception("Failed to fetch index_price for %s: %s", index_ticker, e)
    else:
        # Use default enrichment for SPY
        response = enrich_with_index_data(response, ticker, price, provider)
    
    return response


@router.get("/expirations", response_model=ExpirationsResponse)
def get_expirations(
    ticker: str = Query(default=settings.default_ticker),
    provider: DataProvider = Depends(get_provider_dependency)
):
    return ExpirationsResponse(ticker=ticker, expirations=provider.get_expirations(ticker))
