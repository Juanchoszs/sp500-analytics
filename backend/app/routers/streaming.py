from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from sse_starlette import EventSourceResponse
import asyncio
import json
from datetime import datetime
from app.providers import get_provider

router = APIRouter()


@router.get("/stream/market-data")
async def stream_market_data(ticker: str = "SPY"):
    """Stream market data updates via SSE."""
    
    async def event_generator():
        provider = get_provider()
        last_price = None
        last_yield_data = None
        
        while True:
            try:
                # Get current price
                current_data = provider.get_price(ticker)
                current_price = current_data.get("price")
                
                # Only send if price changed
                if current_price and current_price != last_price:
                    last_price = current_price
                    
                    yield {
                        "event": "price_update",
                        "data": json.dumps({
                            "ticker": ticker,
                            "price": current_price,
                            "change": current_data.get("change"),
                            "change_percent": current_data.get("change_percent"),
                            "timestamp": datetime.utcnow().isoformat(),
                        }),
                    }
                
                # Yield curve updates every 30 seconds
                current_second = datetime.utcnow().second
                if current_second % 30 == 0:
                    yield_data = provider.get_yield_data()
                    
                    # Only send if yield data changed
                    if yield_data != last_yield_data:
                        last_yield_data = yield_data
                        yield {
                            "event": "yield_update",
                            "data": json.dumps({
                                "tnx": yield_data.get("^TNX"),
                                "fvx": yield_data.get("^FVX"),
                                "tyx": yield_data.get("^TYX"),
                                "timestamp": datetime.utcnow().isoformat(),
                            }),
                        }
                
                await asyncio.sleep(1)  # Check every second
                
            except Exception as e:
                yield {
                    "event": "error",
                    "data": json.dumps({"error": str(e)}),
                }
                await asyncio.sleep(5)
    
    return EventSourceResponse(event_generator())
