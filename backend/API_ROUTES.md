# API Documentation - SPY-Intel

## Overview

REST API for options market intelligence analysis. All endpoints use JSON for responses except `/download-report` which returns a binary Word document.

**Base URL:** `http://localhost:8000/api/v1`

**Rate Limiting:** 60 requests per minute per IP (implemented via `slowapi`)

**Content-Type:** `application/json` (except `/download-report`)

---

## Router Architecture

The API is organized into three domain-focused routers:

| Router File | Endpoints | Domain |
|-------------|-----------|---------|
| `routers/price.py` | `/price`, `/expirations` | Price data |
| `routers/exposure.py` | `/options`, `/greeks`, `/gex`, `/dex`, `/maxpain`, `/heatmap` | Options chain & exposure |
| `routers/intelligence.py` | `/intelligence`, `/questions`, `/query`, `/download-report`, `/hedging-strength`, `/yield-anomaly` | Intelligence & analysis |

**Configuration:** `backend/app/main.py`
```python
from app.routers import price, exposure, intelligence

app.include_router(price.router, prefix=settings.api_prefix, tags=["price"])
app.include_router(exposure.router, prefix=settings.api_prefix, tags=["exposure"])
app.include_router(intelligence.router, prefix=settings.api_prefix, tags=["intelligence"])
```

---

## Endpoints

### Price Data Endpoints

#### GET `/price`

Returns current spot price for a ticker with optional index reference data.

**Query Parameters:**
- `ticker` (string, optional): Asset symbol. Default: `SPY`
- `index_ticker` (string, optional): Reference index ticker (e.g., `GSPC` or `^GSPC`)

**Response:**
```json
{
  "ticker": "SPY",
  "price": 550.25,
  "fetched_at": "2026-07-29T13:45:00Z",
  "index_ticker": "^GSPC",
  "index_price": 5500.50,
  "index_ratio": 10.0
}
```

**Error Codes:**
- `404`: Ticker not found
- `500`: Provider error

---

#### GET `/expirations`

Returns available expiration dates for a ticker.

**Query Parameters:**
- `ticker` (string, optional): Asset symbol. Default: `SPY`

**Response:**
```json
{
  "ticker": "SPY",
  "expirations": ["2026-08-01", "2026-08-08", "2026-08-15"]
}
```

**Error Codes:**
- `404`: No expirations available for ticker

---

### Options Chain Endpoints

#### GET `/options`

Returns the complete options chain for a specific expiration.

**Query Parameters:**
- `ticker` (string, optional): Asset symbol. Default: `SPY`
- `expiration` (string, optional): Expiration date in `YYYY-MM-DD` format. Default: nearest expiration

**Response:**
```json
{
  "ticker": "SPY",
  "expiration": "2026-08-01",
  "spot_price": 550.25,
  "calls": [
    {
      "strike": 550,
      "bid": 5.50,
      "ask": 5.75,
      "last_price": 5.60,
      "volume": 1250,
      "open_interest": 4500,
      "implied_volatility": 0.18,
      "contract_type": "call",
      "in_the_money": true
    }
  ],
  "puts": [...],
  "index_ticker": "^GSPC",
  "index_price": 5500.50,
  "index_ratio": 10.0
}
```

**Error Codes:**
- `400`: Invalid expiration format
- `404`: Expiration not available

---

#### GET `/greeks`

Returns Greeks (Delta, Gamma, Vega, Theta, Rho) for all strikes.

**Query Parameters:**
- `ticker` (string, optional): Asset symbol. Default: `SPY`
- `expiration` (string, optional): Expiration date in `YYYY-MM-DD` format

**Response:**
```json
{
  "ticker": "SPY",
  "expiration": "2026-08-01",
  "spot_price": 550.25,
  "strikes": [
    {
      "strike": 550,
      "call_delta": 0.52,
      "call_gamma": 0.08,
      "call_vega": 0.45,
      "call_theta": -0.12,
      "call_rho": 0.15,
      "put_delta": -0.48,
      "put_gamma": 0.08,
      "put_vega": 0.45,
      "put_theta": -0.10,
      "put_rho": -0.12
    }
  ]
}
```

---

### Exposure Endpoints

#### GET `/gex` (Gamma Exposure)

Returns gamma exposure metrics across strikes.

**Query Parameters:**
- `ticker` (string, optional): Asset symbol. Default: `SPY`
- `expiration` (string, optional): Expiration date in `YYYY-MM-DD` format

**Response:**
```json
{
  "ticker": "SPY",
  "expiration": "2026-08-01",
  "spot_price": 550.25,
  "net_gamma_exposure": -125000000,
  "net_delta_exposure": 45000000,
  "net_vega_exposure": 89000000,
  "call_wall": 560,
  "put_wall": 540,
  "gamma_wall": 555,
  "zero_gamma": 548,
  "max_pain": 548.50,
  "put_call_oi_ratio": 1.25,
  "put_call_volume_ratio": 0.95,
  "high_liquidity_strikes": [545, 550, 555],
  "pinning_probability": {"at_550": 0.15},
  "strikes": [...],
  "index_ticker": "^GSPC",
  "index_price": 5500.50,
  "index_ratio": 10.0,
  "call_wall_index": 5600,
  "put_wall_index": 5400,
  "zero_gamma_index": 5480
}
```

---

#### GET `/dex` (Delta Exposure)

Returns delta exposure metrics (same response schema as `/gex`).

---

#### GET `/maxpain`

Returns the max pain strike price and distance from spot.

**Query Parameters:**
- `ticker` (string, optional): Asset symbol. Default: `SPY`
- `expiration` (string, optional): Expiration date in `YYYY-MM-DD` format

**Response:**
```json
{
  "ticker": "SPY",
  "expiration": "2026-08-01",
  "max_pain": 548.50,
  "spot_price": 550.25,
  "distance_pct": 0.32,
  "index_ticker": "^GSPC",
  "index_price": 5500.50,
  "index_ratio": 10.0,
  "max_pain_index": 5485.0
}
```

---

#### GET `/heatmap`

Returns heatmap data for visualization.

**Query Parameters:**
- `ticker` (string, optional): Asset symbol. Default: `SPY`
- `expiration` (string, optional): Expiration date in `YYYY-MM-DD` format
- `metric` (string, optional): Metric type. Options: `delta_exposure`, `volume`, `open_interest`. Default: `delta_exposure`

**Response:**
```json
{
  "ticker": "SPY",
  "expiration": "2026-08-01",
  "metric": "delta_exposure",
  "cells": [
    {
      "strike": 540,
      "metric_call": -25000000,
      "metric_put": 35000000,
      "strike_index": 5400
    }
  ],
  "index_ticker": "^GSPC",
  "index_price": 5500.50,
  "index_ratio": 10.0
}
```

---

### Intelligence Endpoints

#### GET `/intelligence`

Returns comprehensive market intelligence report.

**Query Parameters:**
- `ticker` (string, optional): Asset symbol. Default: `SPY`
- `expiration` (string, optional): Expiration date in `YYYY-MM-DD` format

**Response:**
```json
{
  "ticker": "SPY",
  "expiration": "2026-08-01",
  "spot_price": 550.25,
  "fetched_at": "2026-07-29T13:45:00Z",
  "gamma_analysis": {
    "net_gamma_exposure": -125000000,
    "regime_type": "negative",
    "description": "...",
    "risks": [...],
    "expected_behavior": "..."
  },
  "delta_analysis": {...},
  "options_analysis": {...},
  "volatility_analysis": {...},
  "dealer_analysis": {...},
  "scores": {
    "bullish_score": 45,
    "bearish_score": 55,
    "risk_score": 65
  },
  "confidence": {
    "level": "medium",
    "consistency_score": 0.72
  },
  "regimes": [...],
  "scenarios": {
    "principal": {...},
    "alternative": {...},
    "risk": {...}
  },
  "narrative": "...",
  "index_ticker": "^GSPC",
  "index_price": 5500.50,
  "index_ratio": 10.0
}
```

---

#### GET `/questions`

Returns list of supported questions for the query engine.

**Response:**
```json
{
  "questions": [
    {
      "key": "why_rising",
      "label": "¿Por qué el precio está subiendo?",
      "category": "Dirección"
    },
    {
      "key": "why_falling_fast",
      "label": "¿Por qué cayó tan rápido?",
      "category": "Dirección"
    },
    {
      "key": "why_sideways",
      "label": "¿Por qué el mercado está lateral?",
      "category": "Dirección"
    },
    {
      "key": "why_vol_increasing",
      "label": "¿Por qué aumentó la volatilidad?",
      "category": "Volatilidad"
    },
    {
      "key": "what_dealers_doing",
      "label": "¿Qué están haciendo los dealers?",
      "category": "Microestructura"
    },
    {
      "key": "what_options_indicate",
      "label": "¿Qué indican las opciones?",
      "category": "Microestructura"
    }
  ]
}
```

---

#### GET `/query`

Returns answer to a specific question based on market data.

**Query Parameters:**
- `question_key` (string, required): Question key from `/questions` endpoint
- `ticker` (string, optional): Asset symbol. Default: `SPY`
- `expiration` (string, optional): Expiration date in `YYYY-MM-DD` format

**Response:**
```json
{
  "question_key": "why_rising",
  "answer": "La subida del precio está respaldada microestructuralmente por los siguientes factores objetivos:\n\n- El SPY cotiza sobre el nivel de Gamma Flip ($548.25) en régimen de Gamma Positiva...",
  "justification_data": {
    "net_gex": -125000000,
    "net_dex": 45000000,
    "put_call_volume_ratio": 0.95,
    "spot_vs_zero_gamma": 2.0
  },
  "confidence": "medium"
}
```

**Error Codes:**
- `400`: Invalid question_key
- `404`: Question not supported

---

#### GET `/download-report`

Generates and downloads a Word document with the full intelligence report including charts.

**Query Parameters:**
- `ticker` (string, optional): Asset symbol. Default: `SPY`
- `expiration` (string, optional): Expiration date in `YYYY-MM-DD` format

**Response:**
- **Content-Type:** `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Headers:** `Content-Disposition: attachment; filename="SPY_Intelligence_2026-08-01.docx"`
- **Body:** Binary Word document (.docx)

**Error Codes:**
- `404`: Expiration not available
- `500`: Document generation error

---

#### GET `/hedging-strength`

Returns hedging strength analysis for the current options positioning.

**Query Parameters:**
- `ticker` (string, optional): Asset symbol. Default: `SPY`
- `expiration` (string, optional): Expiration date in `YYYY-MM-DD` format

**Response:**
```json
{
  "score": 0.75,
  "classification": "strong",
  "net_dex": 45000000,
  "net_gex": -125000000,
  "factors": {
    "delta_balance": 0.65,
    "gamma_regime": 0.80,
    "liquidity": 0.85
  },
  "description": "Strong hedging position with balanced delta exposure..."
}
```

---

#### GET `/yield-anomaly`

Returns yield curve anomaly analysis.

**Response:**
```json
{
  "score": 0.45,
  "expected_direction": "flatten",
  "confidence": "medium",
  "curve_spread_2_10": 0.85,
  "credit_spread_ratio": 1.25,
  "anomalies": [
    {
      "category": "yield_curve",
      "severity": "moderate",
      "score": 0.45,
      "description": "2-10 spread below historical average",
      "impact": "potential recession signal"
    }
  ],
  "summary": "Yield curve showing moderate flattening signals..."
}
```

---

## Frontend Configuration

**File:** `frontend/src/api/client.ts`
```typescript
const api = axios.create({ baseURL: "/api/v1" });

export const marketApi = {
  // Price endpoints
  getPrice: (params?: QueryParams) => api.get("/price", { params }),
  getExpirations: (params?: QueryParams) => api.get("/expirations", { params }),

  // Options chain
  getOptions: (params?: QueryParams) => api.get("/options", { params }),
  getGreeks: (params?: QueryParams) => api.get("/greeks", { params }),

  // Exposure
  getGex: (params?: QueryParams) => api.get("/gex", { params }),
  getDex: (params?: QueryParams) => api.get("/dex", { params }),
  getMaxPain: (params?: QueryParams) => api.get("/maxpain", { params }),
  getHeatmap: (params?: QueryParams) => api.get("/heatmap", { params }),

  // Intelligence
  getIntelligence: (params?: QueryParams) => api.get("/intelligence", { params }),
  getQuestions: () => api.get("/questions"),
  getQuery: (params?: QueryParams) => api.get("/query", { params }),

  // Download
  downloadReport: (params?: QueryParams) =>
    api.get("/download-report", {
      params,
      responseType: "blob",
    }).then((r) => r.data as Blob),

  // Additional analytics
  getHedgingStrength: (params?: QueryParams) => api.get("/hedging-strength", { params }),
  getYieldAnomaly: () => api.get("/yield-anomaly"),
};
```

---

## Best Practices

### For Backend Developers

1. **Never change the router prefix** without updating frontend
2. **Maintain API backward compatibility** - use versioning if breaking changes are needed
3. **Use dependency injection** for providers via `Depends(get_provider_dependency)`
4. **Validate all input parameters** using Pydantic models or Query validators
5. **Return consistent error responses** with appropriate HTTP status codes
6. **Log provider errors** with context for debugging
7. **Handle SPY index conversion** consistently using `enrich_with_index_data` helper

### For Frontend Developers

1. **Use relative paths** from base `/api/v1`
2. **Handle rate limiting** (429 responses) gracefully with retry logic
3. **Validate response data** before rendering (check for null/undefined)
4. **Display loading states** during API calls
5. **Cache expirations** to avoid repeated calls
6. **Handle binary responses** correctly for `/download-report`

### API Design Principles

- **RESTful conventions:** GET for read operations, descriptive endpoint names
- **Consistent naming:** Use kebab-case for endpoint paths
- **Optional parameters:** Provide sensible defaults (e.g., `SPY` for ticker)
- **Index enrichment:** Automatically include index data for SPY requests
- **Error handling:** Return descriptive error messages in Spanish for user-facing errors

---

## Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| 400 | Bad Request | Invalid parameter format or value |
| 404 | Not Found | Ticker or expiration not available |
| 429 | Too Many Requests | Rate limit exceeded (60 req/min) |
| 500 | Internal Server Error | Provider failure or unexpected error |

---

## Rate Limiting

**Implementation:** `slowapi` middleware in `backend/app/main.py`

**Limits:** 60 requests per minute per IP address

**Response on Limit Exceeded:**
```json
{
  "detail": "Rate limit exceeded: 60 per 1 minute"
}
```

**Headers:** `Retry-After` header indicates seconds until retry is allowed.
