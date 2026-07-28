# Rutas API - Documentación de Configuración

## Rutas Principales del Market Router

El router `market.py` está incluido con el prefijo `/api/v1` en `main.py`.

### Rutas Disponibles

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/v1/price` | GET | Precio del activo |
| `/api/v1/expirations` | GET | Fechas de vencimiento |
| `/api/v1/options` | GET | Cadena de opciones |
| `/api/v1/greeks` | GET | Griegos por strike |
| `/api/v1/gex` | GET | Gamma Exposure |
| `/api/v1/dex` | GET | Delta Exposure |
| `/api/v1/maxpain` | GET | Max Pain |
| `/api/v1/heatmap` | GET | Heatmap de métricas |
| `/api/v1/intelligence` | GET | Reporte completo de inteligencia |
| `/api/v1/questions` | GET | Lista de preguntas disponibles |
| `/api/v1/query` | GET | Respuesta a pregunta específica |
| `/api/v1/download-report` | GET | Descarga de reporte en Word |

## Configuración del Router

**Archivo:** `backend/app/main.py`
```python
app.include_router(market_router, prefix=settings.api_prefix, tags=["market"])
```

**Prefijo configurado en:** `backend/app/config.py`
```python
api_prefix: str = "/api/v1"
```

## Frontend Configuration

**Archivo:** `frontend/src/api/client.ts`
```typescript
const api = axios.create({ baseURL: "/api/v1" });

export const marketApi = {
  downloadReport: (params?: QueryParams) =>
    api.get("/download-report", {
      params,
      responseType: "blob",
    }).then((r) => r.data as Blob),
};
```

## Reglas para Evitar Errores

1. **Nunca cambiar el prefijo del router** sin actualizar el frontend
2. **Mantener consistencia** entre backend y frontend
3. **Usar rutas relativas** desde el prefijo base `/api/v1`
4. **No agregar prefijos adicionales** como `/market` al router principal

## Endpoint de Descarga de Word

**Ruta completa:** `http://localhost:8000/api/v1/download-report?ticker=SPY`

**Parámetros:**
- `ticker`: Símbolo del activo (default: SPY)
- `expiration`: Fecha de vencimiento opcional

**Respuesta:** Archivo Word (.docx) con reporte completo incluyendo gráficos
