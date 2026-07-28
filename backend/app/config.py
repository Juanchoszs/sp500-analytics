"""
Configuración centralizada. Todo lo que pueda cambiar entre entornos
(desarrollo, producción, otro proveedor de datos) vive aquí, nunca
hardcodeado dentro de la lógica de negocio.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Identidad de la app ---
    app_name: str = "SPY Market Intelligence API"
    api_prefix: str = "/api/v1"

    # --- Proveedor de datos activo ---
    # "yahoo" hoy; mañana "polygon", "orats", "theta" sin tocar la lógica
    # de negocio (ver app/providers/base.py).
    data_provider: str = "yahoo"

    # --- Ticker por defecto ---
    default_ticker: str = "SPY"

    # --- Base de datos ---
    database_url: str = "postgresql+psycopg2://spy_user:spy_pass@localhost:5432/spy_intel"

    # --- Caché (TTL en segundos) ---
    # Yahoo Finance no es un feed en tiempo real y penaliza el scraping
    # agresivo; cacheamos agresivamente para no golpearlo en cada request.
    cache_ttl_price: int = 15          # precio: refresco frecuente
    cache_ttl_options_chain: int = 60  # cadena completa: más pesada, refresco cada minuto
    cache_ttl_expirations: int = 3600  # fechas de vencimiento: cambian poco en el día

    # --- Modelo Black-Scholes ---
    risk_free_rate: float = 0.045      # aproximación T-bill 3M; ajustar según entorno de tasas
    dividend_yield_spy: float = 0.013  # yield aproximado de dividendos de SPY

    # --- CORS ---
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]


settings = Settings()
