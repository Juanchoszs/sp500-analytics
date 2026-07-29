"""
Entry point. Mantiene main.py deliberadamente pequeño: solo cablea
middleware y routers. Toda la lógica vive en providers/, greeks/,
analytics/ y routers/.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.routers.price import router as price_router
from app.routers.exposure import router as exposure_router
from app.routers.intelligence import router as intelligence_router

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
app = FastAPI(
    title=settings.app_name,
    description="Motor cuantitativo de opciones sobre SPY. Interpreta, no predice.",
    version="1.0.0",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(price_router, prefix=settings.api_prefix, tags=["price"])
app.include_router(exposure_router, prefix=settings.api_prefix, tags=["exposure"])
app.include_router(intelligence_router, prefix=settings.api_prefix, tags=["intelligence"])


@app.get("/health")
def health():
    return {"status": "ok", "provider": settings.data_provider}

