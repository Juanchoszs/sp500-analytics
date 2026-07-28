# SPY Market Intelligence API

Backend FastAPI que descarga la cadena de opciones de SPY vía Yahoo Finance
(`yfinance`), calcula los 5 griegos con Black-Scholes implementado desde
cero, y deriva GEX, DEX, Vega Exposure, Max Pain, Gamma/Call/Put Walls,
Zero Gamma, Put/Call Ratio, liquidez y probabilidad de pinning.

## Arquitectura

```
Frontend → API propia (FastAPI) → Yahoo Finance (yfinance)
```

```
app/
  providers/        # Puerto DataProvider + adaptador Yahoo (único lugar que importa yfinance)
  greeks/            # Black-Scholes desde cero (delta, gamma, vega, theta, rho)
  analytics/         # GEX, DEX, Vega Exposure, Max Pain, walls, zero gamma, pinning
  routers/           # Endpoints HTTP (delgados, sin lógica de negocio)
  db/                # Modelos SQLAlchemy para snapshots históricos (opcional)
  cache.py           # Caché TTL en memoria
  config.py          # Toda la configuración centralizada
  schemas.py         # Contratos Pydantic de respuesta
  main.py            # Entry point
```

**Para cambiar de proveedor** (Polygon, ORATS, Theta Data): crea
`app/providers/<nombre>_provider.py` implementando la clase abstracta
`DataProvider` de `app/providers/base.py`, regístralo en
`app/providers/__init__.py`, y cambia `DATA_PROVIDER=<nombre>` en `.env`.
Ningún otro archivo cambia — `analytics/` y `routers/` solo conocen la
interfaz, nunca yfinance directamente.

## Instalación

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # ajusta DATABASE_URL si usas Postgres
uvicorn app.main:app --reload --port 8000
```

La API queda en `http://localhost:8000`, documentación interactiva en
`http://localhost:8000/docs`.

## Base de datos (opcional)

La API funciona sin Postgres: cada endpoint puede responder solo con
Yahoo + caché en memoria. Postgres solo es necesario si quieres guardar
**históricos** de GEX/DEX/Max Pain (Yahoo únicamente te da el presente).

```bash
createdb spy_intel
# Con Alembic (recomendado) o simple create_all para desarrollo:
python -c "from app.db.session import engine; from app.db.models import Base; Base.metadata.create_all(engine)"
```

Un snapshot periódico (cron / APScheduler) que llame a
`build_exposure_report` y guarde una fila en `exposure_snapshots` es
suficiente para alimentar gráficos de evolución temporal en el frontend.

## Endpoints

| Endpoint | Descripción |
|---|---|
| `GET /api/v1/price` | Precio spot actual |
| `GET /api/v1/expirations` | Lista de vencimientos disponibles |
| `GET /api/v1/options` | Cadena completa (calls + puts) |
| `GET /api/v1/greeks` | Delta/Gamma/Vega/Theta/Rho por strike |
| `GET /api/v1/gex` · `/dex` | GEX, DEX, Vega Exposure, walls, zero gamma, max pain, pinning (mismo payload) |
| `GET /api/v1/maxpain` | Max Pain aislado + distancia al spot |
| `GET /api/v1/heatmap?metric=` | Datos para heatmap (`gamma_exposure`\|`open_interest`\|`volume`\|`delta_exposure`) |

Todos aceptan `?ticker=SPY&expiration=YYYY-MM-DD` (ambos opcionales).

## Notas de metodología (léelas antes de confiar en los números)

- **Black-Scholes asume estilo europeo**; SPY tiene opciones americanas.
  La diferencia es pequeña para calls sobre un ETF con dividendo bajo,
  mayor para puts ITM profundos por el valor de ejercicio anticipado.
- **La convención de signo de GEX/DEX es una aproximación estándar de la
  industria** (dealer largo en la porción de puts vendida al público,
  corto en la porción de calls vendida al público). El open interest
  público no revela quién tiene cada lado del contrato — ninguna
  calculadora de GEX basada en datos públicos, comercial o no, puede
  eliminar esta limitación.
- **Zero Gamma / Gamma Flip es una estimación por barrido de spot**,
  manteniendo la IV observada constante. En la realidad el skew de IV
  cambia con el spot, así que es una aproximación, no un valor exacto.
- **Yahoo Finance no es un feed de nivel institucional**: no expone
  Greeks pre-calculados, el IV que reporta puede tener retrasos, y no
  hay SLA. Por eso el diseño aísla completamente esta dependencia detrás
  de `DataProvider` — está pensado para migrarse a un feed profesional
  en producción.

## Validación realizada

La lógica matemática (Black-Scholes y el motor de exposure) fue probada
con datos simulados dentro de este entorno: paridad put-call verificada,
simetría de gamma call/put verificada, y los 8 endpoints probados con un
`DataProvider` falso inyectado (sin red). **No fue posible probar contra
Yahoo Finance en vivo** porque este entorno de desarrollo no tiene salida
de red hacia `query1.finance.yahoo.com`; pruébalo en tu máquina con
`uvicorn app.main:app --reload` y conexión a internet normal.
