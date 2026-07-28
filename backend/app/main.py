"""
Entry point. Mantiene main.py deliberadamente pequeño: solo cablea
middleware y routers. Toda la lógica vive en providers/, greeks/,
analytics/ y routers/.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.market import router as market_router

app = FastAPI(
    title=settings.app_name,
    description="Motor cuantitativo de opciones sobre SPY. Interpreta, no predice.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market_router, prefix=settings.api_prefix, tags=["market"])


@app.get("/health")
def health():
    return {"status": "ok", "provider": settings.data_provider}
