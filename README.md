# 📈 SPY Market Intelligence

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Python_3.13-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.13" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Licencia-MIT-green?style=for-the-badge" alt="MIT License" />
</p>

Sistema avanzado de **inteligencia de mercado cuantitativa** especializado en análisis de opciones del ETF **SPY** con arquitectura de microservicios, procesamiento en tiempo real y capacidades de generación de informes automatizados. El sistema implementa un motor cuantitativo completo basado en el modelo Black-Scholes-Merton, análisis de microestructura de mercado, detección de anomalías en curvas de rendimiento, y generación de narrativas automatizadas mediante procesamiento de lenguaje natural.

---

## 🔍 Arquitectura del Sistema

### Stack Tecnológico

**Backend (Python 3.13+):**
- **Framework:** FastAPI 0.115.0 con Uvicorn 0.30.6 (ASGI server)
- **Rate Limiting:** slowapi 0.1.10 (60 requests/min por IP)
- **CORS:** Configuración multi-origen con Starlette middleware
- **Validación:** Pydantic 2.9.2 con Pydantic Settings para configuración
- **Matemáticas Financieras:** Implementación from-scratch de Black-Scholes-Merton
- **Procesamiento de Datos:** NumPy 2.5.1, Pandas 3.0.3
- **Generación de Documentos:** python-docx 1.2.0, Matplotlib 3.10.8
- **Base de Datos:** PostgreSQL con psycopg2-binary 2.9.12, Peewee ORM 4.2.6
- **Streaming:** SSE (Server-Sent Events) con sse-starlette 1.8.2
- **Caching:** cachetools 5.5.0 con TTL configurable

**Frontend (TypeScript + React 18):**
- **Build Tool:** Vite 5.4.3 con @vitejs/plugin-react 4.3.1
- **Type Safety:** TypeScript 5.5.4 con definiciones de tipos completas
- **UI Framework:** React 18.3.1 + React DOM 18.3.1
- **Styling:** TailwindCSS 3.4.10 con PostCSS 8.4.45 y Autoprefixer 10.4.20
- **Data Visualization:** 
  - Recharts 3.10.0 para gráficos de exposición
  - Lightweight Charts 4.2.0 para time-series financieras
- **HTTP Client:** Axios 1.7.7
- **Utility Libraries:** clsx 2.1.1, tailwind-merge 3.6.0, lucide-react 1.25.0

### Patrón de Arquitectura: Hexagonal/Clean Architecture

El sistema implementa una arquitectura hexagonal que separa claramente la lógica de negocio de la infraestructura:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                         │
│  ┌─────────────────┐           ┌─────────────────────────┐  │
│  │  React Frontend  │◄──────────►│   FastAPI Routers       │  │
│  │  (TypeScript)    │   HTTP    │   (price, exposure,     │  │
│  │                 │           │    intelligence, etc.)  │  │
│  └─────────────────┘           └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Analytics Engine (20+ modules)                       │  │
│  │  - query_engine.py: Query processing & NLP            │  │
│  │  - narrative_engine.py: Automated report generation    │  │
│  │  - scenario_engine.py: Monte Carlo scenarios          │  │
│  │  - confidence_engine.py: Confidence scoring            │  │
│  │  - yield_anomaly.py: Yield curve anomaly detection     │  │
│  │  - hedging_strength.py: Hedging position analysis     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DOMAIN LAYER                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Domain Models & Business Logic                       │  │
│  │  - Greeks: Black-Scholes implementation                │  │
│  │  - Exposure: GEX/DEX/Vega calculations                 │  │
│  │  - Regimes: Market regime detection                    │  │
│  │  - Scenarios: Scenario generation logic                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Data Providers (Hexagonal Ports)                      │  │
│  │  - DataProvider Interface (base.py)                    │  │
│  │  - Yahoo Finance Implementation                         │  │
│  │  - Extensible to Polygon, ORATS, Theta Data            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Caching Layer (TTL-based)                           │  │
│  │  - Price: 15s TTL                                     │  │
│  │  - Options Chain: 60s TTL                             │  │
│  │  - Expirations: 3600s TTL                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Módulos de Análisis Avanzado

**Analytics Engine (20+ módulos especializados):**

1. **query_engine.py** (27KB): Motor de procesamiento de consultas con NLP
2. **docx_generator.py** (23KB): Generación de informes Word con gráficos integrados
3. **yield_anomaly.py** (15KB): Detección de anomalías en curvas de rendimiento
4. **narrative_engine.py** (8KB): Generación automatizada de narrativas de mercado
5. **scenario_engine.py** (12KB): Motor de escenarios Monte Carlo
6. **rule_engine.py** (11KB): Motor de reglas para detección de patrones
7. **score_engine.py** (9KB): Sistema de scoring de inteligencia de mercado
8. **confidence_engine.py** (4KB): Motor de confianza en predicciones
9. **chart_generator.py** (7KB): Generación de gráficos vectoriales
10. **market_analyzer.py** (4KB): Análisis de condiciones de mercado
11. **volatility_analyzer.py** (4KB): Análisis de volatilidad y VIX
12. **gamma_analyzer.py** (2KB): Análisis de exposición gamma
13. **delta_analyzer.py** (3KB): Análisis de exposición delta
14. **dealer_analyzer.py** (2KB): Análisis de posicionamiento de dealers
15. **options_analyzer.py** (2KB): Análisis de flujo de opciones
16. **hedging_strength.py** (4KB): Análisis de fuerza de cobertura
17. **index_converter.py** (4KB): Conversión entre SPY y S&P 500
18. **query_cache.py** (2KB): Caché de consultas inteligente

---

## 🛠️ Estructura del Proyecto

El repositorio sigue una arquitectura monorepo con separación clara de dominios:

```text
spy-intel/
├── backend/                        # FastAPI Backend Service
│   ├── app/
│   │   ├── analytics/             # 20+ analytics modules
│   │   │   ├── query_engine.py    # Query processing & NLP
│   │   │   ├── docx_generator.py  # Word report generation
│   │   │   ├── yield_anomaly.py   # Yield curve anomaly detection
│   │   │   ├── narrative_engine.py # Automated narrative generation
│   │   │   ├── scenario_engine.py  # Monte Carlo scenarios
│   │   │   ├── confidence_engine.py # Confidence scoring
│   │   │   ├── rule_engine.py     # Pattern detection rules
│   │   │   ├── score_engine.py    # Intelligence scoring
│   │   │   ├── chart_generator.py # Vector chart generation
│   │   │   ├── market_analyzer.py # Market conditions
│   │   │   ├── volatility_analyzer.py # VIX analysis
│   │   │   ├── gamma_analyzer.py  # Gamma exposure analysis
│   │   │   ├── delta_analyzer.py  # Delta exposure analysis
│   │   │   ├── dealer_analyzer.py # Dealer positioning
│   │   │   ├── options_analyzer.py # Options flow analysis
│   │   │   ├── hedging_strength.py # Hedging analysis
│   │   │   ├── index_converter.py # SPY↔S&P 500 conversion
│   │   │   └── query_cache.py     # Intelligent query caching
│   │   ├── domain/                # Domain models & business logic
│   │   ├── infrastructure/        # Infrastructure implementations
│   │   ├── greeks/                # Black-Scholes implementation
│   │   │   └── black_scholes.py   # From-scratch BSM with dividend yield
│   │   ├── providers/             # Data provider interface (hexagonal)
│   │   │   ├── base.py            # DataProvider abstract interface
│   │   │   └── __init__.py        # Provider factory
│   │   ├── routers/               # API endpoints by domain
│   │   │   ├── price.py           # Price data endpoints
│   │   │   ├── exposure.py        # Options chain & exposure
│   │   │   ├── intelligence.py    # Intelligence & analysis
│   │   │   ├── yield_curve.py     # Yield curve analysis
│   │   │   ├── streaming.py       # SSE streaming endpoints
│   │   │   └── helpers.py         # Router utilities
│   │   ├── cache.py               # TTL-based memory cache
│   │   ├── config.py              # Centralized configuration
│   │   ├── schemas.py             # Pydantic models (316 lines)
│   │   ├── main.py                # FastAPI application entry
│   │   └── tests/                 # Unit & integration tests
│   ├── requirements.txt           # Python dependencies
│   ├── run_tests.py               # Test runner
│   ├── API_ROUTES.md              # Comprehensive API documentation
│   └── README.md                  # Backend-specific docs
├── frontend/                       # React + TypeScript Frontend
│   ├── src/
│   │   ├── components/            # 20+ React components
│   │   │   ├── Dashboard.tsx      # Main dashboard
│   │   │   ├── IntelligenceReport.tsx # Intelligence report UI
│   │   │   ├── GammaExposureView.tsx # Gamma visualization
│   │   │   ├── DeltaExposureChart.tsx # Delta visualization
│   │   │   ├── VolumeChart.tsx    # Volume analysis
│   │   │   ├── OpenInterestChart.tsx # OI analysis
│   │   │   ├── MaxPainCard.tsx    # Max pain display
│   │   │   ├── LevelsPanel.tsx    # Key levels panel
│   │   │   ├── MarketProfilePanel.tsx # Market profile
│   │   │   ├── HedgingStrengthPanel.tsx # Hedging analysis
│   │   │   ├── YieldAnomalyPanel.tsx # Yield anomaly UI
│   │   │   ├── YieldCurveChart.tsx # Yield curve visualization
│   │   │   ├── CreditSpreadChart.tsx # Credit spread analysis
│   │   │   ├── AnomalyChart.tsx   # Anomaly detection charts
│   │   │   ├── LogReturnsChart.tsx # Log returns analysis
│   │   │   ├── GammaProfileChart.tsx # Gamma profile
│   │   │   ├── StrikeGammaChart.tsx # Strike-specific gamma
│   │   │   ├── StrikeBarsChart.tsx # Strike bars
│   │   │   ├── MultiLayerHeatmap.tsx # Advanced heatmap
│   │   │   ├── IVSmileChart.tsx   # Volatility smile
│   │   │   ├── OpenInterestTable.tsx # OI table
│   │   │   ├── MarketQAPanel.tsx  # Market QA panel
│   │   │   └── AutomaticAnalysisPanel.tsx # Auto-analysis
│   │   ├── hooks/                 # Custom React hooks
│   │   │   └── useReportDownload.ts # Report download hook
│   │   ├── api/                   # API client layer
│   │   ├── types/                 # TypeScript type definitions
│   │   │   └── index.ts           # 360+ lines of type definitions
│   │   ├── App.tsx                # Root component
│   │   ├── main.tsx               # Entry point
│   │   └── index.css              # Global styles
│   ├── package.json               # Node.js dependencies
│   ├── tsconfig.json              # TypeScript configuration
│   ├── vite.config.ts             # Vite build configuration
│   ├── tailwind.config.js         # TailwindCSS configuration
│   └── postcss.config.js          # PostCSS configuration
├── Planes/                        # Engineering planning
│   └── plans/                     # Sprint plans & roadmaps
├── principal-engineering-auditor/ # Engineering audit tools
├── design-system/                 # Design system documentation
├── logs/                          # Runtime logs directory
├── start.sh                       # Unified development script
├── engineering-brainstorm.md      # Engineering notes
└── README.md                      # This file
```

---

## � Características Técnicas Principales

### Motor Cuantitativo Black-Scholes-Merton
- **Implementación from-scratch** sin dependencias de pricing externas
- **Soporte para dividend yield continuo** (q), crítico para SPY con dividendos trimestrales
- **Cálculo de 5 griegos:** Delta, Gamma, Vega, Theta, Rho con derivadas analíticas
- **Manejo de edge cases:** Contratos sin vida útil, IV nula, valores at-boundary
- **Precisión documentada:** Acepta simplificación europea vs americana (documentada explícitamente)

### Métricas de Exposición Avanzadas
- **GEX (Gamma Exposure):** Sensibilidad de delta a cambios de precio subyacente
- **DEX (Delta Exposure):** Exposición delta neta por strike
- **Vega Exposure:** Sensibilidad a cambios de volatilidad implícita
- **Max Pain:** Strike donde el dolor máximo para compradores de opciones
- **Gamma Wall:** Nivel de máxima concentración gamma
- **Call/Put Walls:** Niveles de máxima concentración OI en calls/puts
- **Zero Gamma (Gamma Flip):** Punto de inflexión gamma, crítico para regímenes de mercado
- **Pinning Probability:** Probabilidad estadística de pinning en Max Pain
- **Put/Call Ratio:** Ratios de volumen y OI para sentimiento

### Sistema de Inteligencia de Mercado
- **Query Engine con NLP:** Procesamiento de preguntas en lenguaje natural
- **Scenario Engine:** Generación de escenarios Monte Carlo con 3 variantes
- **Confidence Engine:** Scoring de confianza con análisis de consistencia
- **Rule Engine:** Detección de patrones con reglas parametrizables
- **Score Engine:** Sistema multidimensional de scoring (bullish/bearish/volatility/dealer)
- **Narrative Engine:** Generación automatizada de narrativas en español

### Análisis de Curva de Rendimiento
- **Yield Anomaly Detection:** Detección de anomalías en curvas de tesorería
- **Credit Spread Analysis:** Análisis de spreads corporativos vs soberanos
- **Log Returns Analysis:** Análisis de retornos logarítmicos con detección de outliers
- **Z-Score Based Detection:** Identificación estadística de desviaciones
- **Multi-Metric Integration:** Combina múltiples indicadores de rendimiento

### Generación de Informes Profesionales
- **DOCX Generation:** Informes Word con gráficos vectoriales nativos
- **Matplotlib Integration:** Gráficos de alta calidad insertados en documentos
- **Pydantic Schema Support:** Validación de datos con esquemas tipados
- **Multi-Section Reports:** Resumen ejecutivo, análisis detallado, escenarios, conclusiones
- **Dynamic Content:** Contenido generado dinámicamente basado en condiciones de mercado

### Arquitectura de Streaming
- **Server-Sent Events (SSE):** Streaming en tiempo real de datos de mercado
- **Event-Driven Updates:** Actualizaciones automáticas en frontend
- **Connection Management:** Manejo robusto de conexiones SSE
- **Rate Limiting:** Protección contra abuso con slowapi

### Caching Inteligente
- **TTL-based Caching:** Cache con tiempo de vida configurable
- **Multi-level TTL:** 15s (precio), 60s (cadena), 3600s (expiraciones)
- **Memory-based:** Caché en memoria para máxima velocidad
- **Provider Protection:** Protección contra saturación de Yahoo Finance

### Index Reference System
- **SPY ↔ S&P 500 Conversion:** Conversión automática entre ETF e índice
- **Dual Display:** Visualización simultánea en ambos niveles
- **Ratio Calculation:** Cálculo dinámico de ratio de conversión
- **Index Data Integration:** Datos de índice integrados en análisis

---

## �🚀 Inicio Rápido en Entorno Local

### Requisitos Previos

- **Python 3.11+** (Desarrollado y optimizado en Python 3.13)
- **Node.js** (Versión 18 o superior recomendada)
- Un entorno de terminal compatible con Bash (macOS/Linux o Git Bash/WSL en Windows)

### ⚡ Lanzamiento Rápido (Recomendado)

Disponemos de un script automatizado `start.sh` en la raíz del proyecto. Este script se encarga de:
1. Comprobar los puertos libres (8000, 5173, etc.) y limpiar cualquier proceso residual en ellos.
2. Iniciar el entorno virtual de Python (`venv`) en el backend y arrancar el servidor FastAPI.
3. Iniciar el servidor de desarrollo de Vite en el frontend.
4. Centralizar los logs del sistema en el directorio `logs/`.

Simplemente ejecuta:

```bash
chmod +x start.sh
./start.sh
```

Una vez ejecutado:
* **Frontend:** Abre tu navegador en [http://localhost:5173](http://localhost:5173) (o el puerto que te indique la terminal).
* **Backend API & Docs:** Accede a [http://localhost:8000/docs](http://localhost:8000/docs) para interactuar con la interfaz Swagger/OpenAPI.
* Para detener ambos servidores de forma segura, presiona `Ctrl+C` en la terminal.

---

## ⚙️ Configuración Manual por Componente

Si prefieres ejecutar los componentes de manera manual e individual, sigue los siguientes pasos:

### 1. Servidor Backend

Navega a la carpeta de backend, crea tu entorno virtual, instala las dependencias y arranca el servidor:

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows usa: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno (opcional)
cp .env.example .env

# Arrancar el servidor
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Cliente Frontend

En una terminal independiente, navega al directorio del frontend e instala las librerías de Node.js:

```bash
cd frontend

# Instalar dependencias
npm install

# Arrancar en modo desarrollo
npm run dev
```

---

## 📡 Endpoints Principales de la API

La API expone múltiples endpoints diseñados para consultar datos procesados de mercado y descargar informes:

| Método | Endpoint | Parámetros Disponibles | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Ninguno | Estado de salud de la API. |
| `GET` | `/api/v1/price` | `ticker` *(opcional)* | Obtiene el precio spot actual (Default: SPY). |
| `GET` | `/api/v1/expirations` | `ticker` *(opcional)* | Lista de fechas de vencimiento disponibles para las opciones. |
| `GET` | `/api/v1/options` | `ticker`, `expiration` | Devuelve la cadena completa de opciones (Calls + Puts) con strikes. |
| `GET` | `/api/v1/greeks` | `ticker`, `expiration` | Cálculo detallado de Delta, Gamma, Vega, Theta y Rho por strike. |
| `GET` | `/api/v1/gex` | `ticker`, `expiration` | Análisis completo de GEX, DEX, Vega, walls, zero gamma y max pain. |
| `GET` | `/api/v1/maxpain` | `ticker`, `expiration` | Max Pain aislado junto con la distancia porcentual al spot. |
| `GET` | `/api/v1/download-report` | `ticker` | Genera y descarga el reporte en formato Word (`.docx`). |

*Nota: Los endpoints de descarga implementan cabeceras `Cache-Control: no-store` para forzar a los navegadores a recibir siempre la última versión y evitar almacenamiento no deseado.*

---

## 🧪 Pruebas y Validación

El proyecto cuenta con un script de verificación automatizado para comprobar la integridad de los algoritmos cuantitativos y el generador de reportes.

Para ejecutar los tests locales:

```bash
cd backend
# Asegúrate de tener activado el entorno virtual (venv)
python run_tests.py
```

### Qué evalúan estas pruebas:
1. **Lógica Matemática de Black-Scholes:** Valida la paridad Put-Call, la simetría de los coeficientes de Gamma y la consistencia matemática ante diferentes volatilidades e intereses.
2. **Generador de Reportes (DOCX):** Comprueba que la creación del documento sea exitosa usando tanto diccionarios nativos como modelos de datos Pydantic, garantizando su estabilidad frente a cambios de estructura.
3. **Inyección de Dependencias en API:** Testea los endpoints inyectando un proveedor de simulación virtual (`Mock DataProvider`), validando las respuestas sin necesidad de realizar peticiones HTTP externas.

---

## 📚 Metodología Cuantitativa y Limitaciones

Al analizar las métricas generadas por este motor, es importante tener en cuenta las siguientes consideraciones metodológicas:

1. **Estilo de las Opciones:** Las fórmulas de Black-Scholes implementadas asumen opciones de estilo europeo (ejercicio únicamente al vencimiento). Dado que las opciones de SPY son de tipo americano (ejercicio temprano permitido), los cálculos pueden diferir ligeramente en puts muy profundos en el dinero (ITM).
2. **Supuesto de Exposición de Dealers:** La convención del signo de GEX/DEX asume una distribución estándar del mercado (el público compra puts y vende calls; los creadores de mercado/dealers toman la posición contraria: largos en puts y cortos en calls). Dado que los datos de volumen del mercado público no detallan el lado comprador/vendedor neto de cada transacción, esta métrica representa una aproximación estadística estándar en la industria.
3. **Cálculo de Zero Gamma / Gamma Flip:** Se estima simulando barridos de precios spot bajo el supuesto de volatilidad implícita (IV) estática. En el comportamiento real de mercado, el skew de volatilidad cambia de forma dinámica a medida que varía el spot.
