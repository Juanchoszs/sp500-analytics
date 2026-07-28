# 📈 SPY Market Intelligence

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Python_3.13-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.13" />
  <img src="https://img.shields.io/badge/Licencia-MIT-green?style=for-the-badge" alt="MIT License" />
</p>

Plataforma profesional e interactiva de **inteligencia de mercado cuantitativa** enfocada en el análisis de opciones del ETF **SPY**. El sistema calcula métricas clave de exposición (GEX, DEX, Vega), modela escenarios de mercado, genera narrativas automatizadas y compila informes descargables en formato Word (`.docx`) con gráficos integrados de alta calidad.

---

## 🔍 Características Principales

- **Motor Cuantitativo de Opciones:**
  - Descarga automática de la cadena de opciones de SPY en tiempo real a través de `yfinance`.
  - Implementación matemática desde cero del modelo **Black-Scholes** para el cálculo de los 5 griegos (Delta, Gamma, Vega, Theta, Rho).
  - Derivación analítica de métricas avanzadas: GEX (Gamma Exposure), DEX (Delta Exposure), Vega Exposure, Max Pain, Gamma Wall, Call/Put Walls, Zero Gamma (Gamma Flip), Put/Call Ratio, liquidez y probabilidad de pinning.

- **Generador de Reportes Profesionales (DOCX):**
  - Ubicado en [docx_generator.py](file:///Users/macbookpro/Desktop/spy-intel/backend/app/analytics/docx_generator.py).
  - Produce un informe ejecutivo estructurado con resúmenes, tablas de datos del mercado, narrativa autogenerada basada en la distribución de la exposición, escenarios simulados y conclusiones.
  - Inserta gráficos vectoriales nativos (generados mediante `matplotlib`) de GEX, DEX, Open Interest y Volumen.
  - Diseño seguro y tolerante a fallos que acepta tanto diccionarios como esquemas Pydantic.

- **Backend Robusto (FastAPI):**
  - Endpoints optimizados con caché TTL en memoria para evitar saturación del proveedor.
  - Arquitectura limpia que aísla los proveedores de datos bajo la interfaz [DataProvider](file:///Users/macbookpro/Desktop/spy-intel/backend/app/providers/base.py), lo que permite migrar de Yahoo Finance a feeds institucionales (Polygon, ORATS, Theta Data) sin alterar la lógica del negocio.
  - Soporte opcional para persistencia de snapshots históricos en bases de datos PostgreSQL/SQLAlchemy.

- **Frontend Moderno (React + TypeScript + Vite):**
  - Panel visual de control con gráficos interactivos dinámicos de la exposición de opciones (Recharts, Lightweight Charts).
  - Descarga directa de informes generados dinámicamente en el servidor en un solo clic.

---

## 🛠️ Estructura del Proyecto

El repositorio está organizado con un desacoplamiento claro entre el backend de análisis y la interfaz de usuario:

```text
spy-intel/
├── .github/                 # Flujos de trabajo y configuraciones de GitHub
├── backend/                 # API FastAPI y Motor Cuantitativo
│   ├── app/
│   │   ├── analytics/       # Módulo para cálculo de GEX, DEX, Walls y reporte DOCX
│   │   ├── db/              # Modelos de base de datos (PostgreSQL/SQLAlchemy opcional)
│   │   ├── greeks/          # Biblioteca matemática de Black-Scholes desde cero
│   │   ├── providers/       # Proveedor de datos (Yahoo Finance / adaptadores abstractos)
│   │   ├── routers/         # Endpoints de la API
│   │   ├── cache.py         # Caché en memoria con tiempo de expiración (TTL)
│   │   ├── config.py        # Configuración centralizada de variables de entorno
│   │   ├── schemas.py       # Modelos de datos Pydantic
│   │   └── main.py          # Archivo de entrada de la aplicación FastAPI
│   ├── requirements.txt     # Dependencias de Python
│   └── run_tests.py         # Runner de pruebas unitarias y de integración
├── frontend/                # Interfaz de usuario (React + Vite)
│   ├── src/                 # Componentes, vistas y utilidades de React
│   ├── package.json         # Dependencias y scripts de Node.js
│   └── tailwind.config.js   # Estilos CSS de Tailwind
├── logs/                    # Directorio de registro generado en ejecución
├── start.sh                 # Script Bash unificado para desarrollo local
└── README.md                # Este archivo
```

---

## 🚀 Inicio Rápido en Entorno Local

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
