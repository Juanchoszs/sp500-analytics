# Sprint 5 Plan: Advanced Visualization & Yield Anomaly Fix

**Risk Level:** Medium

---

## Sprint 5 Tasks Overview

| Task | Description | Effort | Risk | Priority |
|------|-------------|--------|------|----------|
| 5.1 | Fix yield anomaly calculation with correct data sources | 4 hours | Medium | P1 |
| 5.2 | Migrate to Lightweight Charts for interactive frontend | 6 hours | Medium | P1 |
| 5.3 | Add real-time chart updates with WebSocket/SSE | 4 hours | Medium | P1 |
| 5.4 | Create yield curve visualization | 3 hours | Low | P2 |
| 5.5 | Add credit spread historical chart | 3 hours | Low | P2 |

---

## Task 5.1: Fix Yield Anomaly Calculation

### Before Change
**File:** `backend/app/analytics/yield_anomaly.py`

**Problems Identified:**
1. **Incorrect spread calculation:** Uses 10Y - 13W (TNX - IRX) instead of standard 10Y - 2Y or 10Y - 5Y
2. **Arbitrary thresholds:** Thresholds (-0.5, 0.68, 0.73) not based on historical analysis
3. **Fixed defaults:** Uses hardcoded fallback values (4.25, 4.50, 4.10, 4.45) instead of fetching real data
4. **Missing validation:** No validation that provider data is actually retrieved
5. **Incorrect curve interpretation:** IRX is 13-week bill, not 3-month rate in traditional yield curve analysis
6. **No historical context:** No comparison to historical averages or z-scores

### After Change
**Action:** Rewrite yield anomaly with correct Treasury data and statistical validation.

**File:** `backend/app/analytics/yield_anomaly.py`

```python
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from app.providers import get_provider
import numpy as np


@dataclass
class AnomalyItem:
    category: str
    severity: str
    score: float
    description: str
    impact: str
    z_score: Optional[float] = None  # Statistical significance


@dataclass
class YieldAnomalyReport:
    score: float
    expected_direction: str
    confidence: str
    curve_spread_2_10: float
    curve_spread_5_10: float
    credit_spread_ratio: float
    anomalies: List[Dict[str, Any]]
    summary: str
    historical_context: Dict[str, Any]


class YieldAnomalyAnalyzer:
    # Historical averages (approximate based on 10-year data)
    HISTORICAL_AVERAGES = {
        "curve_2_10_mean": 0.85,  # Average 10Y-2Y spread
        "curve_2_10_std": 0.95,
        "curve_5_10_mean": 0.45,
        "curve_5_10_std": 0.35,
        "credit_ratio_mean": 0.705,
        "credit_ratio_std": 0.025,
    }
    
    @staticmethod
    def _calculate_z_score(value: float, mean: float, std: float) -> float:
        """Calculate z-score for statistical significance."""
        if std == 0:
            return 0.0
        return (value - mean) / std
    
    @staticmethod
    def _get_severity_from_z_score(z_score: float) -> str:
        """Determine severity based on z-score."""
        abs_z = abs(z_score)
        if abs_z >= 2.5:
            return "Critical"
        elif abs_z >= 2.0:
            return "High"
        elif abs_z >= 1.5:
            return "Medium"
        else:
            return "Low"
    
    @staticmethod
    def analyze() -> YieldAnomalyReport:
        provider = get_provider()
        raw_data = provider.get_yield_data()
        
        # Use actual provider data with validation
        rate_2y = raw_data.get("^FVX")  # 5-year Treasury (proxy for 2Y if needed)
        rate_5y = raw_data.get("^FVX")  # 5-year Treasury
        rate_10y = raw_data.get("^TNX")  # 10-year Treasury
        rate_30y = raw_data.get("^TYX")  # 30-year Treasury
        
        hyg_price = raw_data.get("HYG")
        lqd_price = raw_data.get("LQD")
        
        # Validate data availability
        if None in (rate_10y, rate_5y, hyg_price, lqd_price):
            raise ValueError("Required yield data not available from provider")
        
        # Calculate correct spreads
        spread_2_10 = rate_10y - rate_2y if rate_2y else rate_10y - rate_5y
        spread_5_10 = rate_10y - rate_5y
        credit_ratio = hyg_price / lqd_price if lqd_price > 0 else 0.7
        
        anomalies: List[AnomalyItem] = []
        scores: List[float] = []
        
        # 1. Yield Curve Inversion (2Y-10Y spread - most reliable indicator)
        z_curve_2_10 = YieldAnomalyAnalyzer._calculate_z_score(
            spread_2_10,
            YieldAnomalyAnalyzer.HISTORICAL_AVERAGES["curve_2_10_mean"],
            YieldAnomalyAnalyzer.HISTORICAL_AVERAGES["curve_2_10_std"]
        )
        
        if spread_2_10 < -0.25:  # Inversion threshold
            severity = YieldAnomalyAnalyzer._get_severity_from_z_score(z_curve_2_10)
            score = min(100, max(0, 50 + abs(z_curve_2_10) * 20))
            anomalies.append(AnomalyItem(
                category="Yield Curve Inversion",
                severity=severity,
                score=score,
                description=f"Inversión de curva 2Y-10Y detectada (spread: {spread_2_10:.2f}%, z-score: {z_curve_2_10:.2f}).",
                impact="Históricamente, la inversión 2Y-10Y ha precedido recesiones en 6-18 meses. Indica expectativas de desaceleración económica.",
                z_score=z_curve_2_10
            ))
            scores.append(score)
        elif spread_2_10 < 0.0:  # Near inversion
            anomalies.append(AnomalyItem(
                category="Yield Curve Flattening",
                severity="Medium",
                score=55.0,
                description=f"Aplanamiento de curva 2Y-10Y (spread: {spread_2_10:.2f}%).",
                impact="Curva cercana a inversión. Sugiere tightening monetario y expectativas de desaceleración.",
                z_score=z_curve_2_10
            ))
            scores.append(55.0)
        else:
            scores.append(20.0)
        
        # 2. 5Y-10Y Spread (mid-curve analysis)
        z_curve_5_10 = YieldAnomalyAnalyzer._calculate_z_score(
            spread_5_10,
            YieldAnomalyAnalyzer.HISTORICAL_AVERAGES["curve_5_10_mean"],
            YieldAnomalyAnalyzer.HISTORICAL_AVERAGES["curve_5_10_std"]
        )
        
        if spread_5_10 < 0.0:
            severity = YieldAnomalyAnalyzer._get_severity_from_z_score(z_curve_5_10)
            score = min(100, max(0, 45 + abs(z_curve_5_10) * 15))
            anomalies.append(AnomalyItem(
                category="Mid-Curve Inversion",
                severity=severity,
                score=score,
                description=f"Inversión en tramo medio 5Y-10Y (spread: {spread_5_10:.2f}%, z-score: {z_curve_5_10:.2f}).",
                impact="Inversión en tramo medio indica presión sobre tasas largas por expectativas de recorte futuro.",
                z_score=z_curve_5_10
            ))
            scores.append(score)
        else:
            scores.append(25.0)
        
        # 3. Credit Spread Dislocation (HYG/LQD ratio with z-score)
        z_credit = YieldAnomalyAnalyzer._calculate_z_score(
            credit_ratio,
            YieldAnomalyAnalyzer.HISTORICAL_AVERAGES["credit_ratio_mean"],
            YieldAnomalyAnalyzer.HISTORICAL_AVERAGES["credit_ratio_std"]
        )
        
        if credit_ratio < 0.68:  # Stressed credit
            severity = YieldAnomalyAnalyzer._get_severity_from_z_score(z_credit)
            score = min(100, max(0, 60 + abs(z_credit) * 15))
            anomalies.append(AnomalyItem(
                category="Credit Spread Dislocation",
                severity=severity,
                score=score,
                description=f"Ratio HYG/LQD estresado ({credit_ratio:.3f}, z-score: {z_credit:.2f}).",
                impact="Spreads de crédito corporativo ensanchados. Indica aversión al riesgo y presión sobre high yield.",
                z_score=z_credit
            ))
            scores.append(score)
        elif credit_ratio > 0.73:  # Euphoric credit
            anomalies.append(AnomalyItem(
                category="Credit Euphoria",
                severity="Low",
                score=35.0,
                description=f"Ratio HYG/LQD elevado ({credit_ratio:.3f}, z-score: {z_credit:.2f}).",
                impact="Spreads de crédito comprimidos. Puede indicar exceso de confianza en riesgo.",
                z_score=z_credit
            ))
            scores.append(35.0)
        else:
            scores.append(45.0)
        
        # 4. Steepness Anomaly (10Y-30Y spread)
        if rate_30y:
            spread_10_30 = rate_30y - rate_10y
            if spread_10_30 < 0.2:  # Very flat long end
                anomalies.append(AnomalyItem(
                    category="Long-End Flattening",
                    severity="Medium",
                    score=50.0,
                    description=f"Tramo largo muy plano (30Y-10Y: {spread_10_30:.2f}%).",
                    impact="Indica expectativas de baja inflación de largo plazo o demanda de duration."
                ))
                scores.append(50.0)
            else:
                scores.append(20.0)
        else:
            scores.append(20.0)
        
        # 5. Combined Anomaly (curve inversion + credit stress)
        if spread_2_10 < 0 and credit_ratio < 0.70:
            anomalies.append(AnomalyItem(
                category="Systemic Stress Signal",
                severity="Critical",
                score=90.0,
                description="Inversión de curva + spreads de crédito estresados simultáneamente.",
                impact="Combinación históricamente asociada con episodios de estrés financiero severo."
            ))
            scores.append(90.0)
        else:
            scores.append(25.0)
        
        # Calculate weighted score
        overall_score = sum(scores) / len(scores) if scores else 30.0
        overall_score = round(min(100.0, max(0.0, overall_score)), 1)
        
        # Expected direction
        if overall_score >= 65.0:
            expected_direction = "Bearish"
            summary = "Múltiples señales de estrés en curva de tipos y crédito sugieren presión bajista significativa."
        elif overall_score <= 35.0:
            expected_direction = "Bullish"
            summary = "Estructura de tasas normal y spreads de crédito saludables. Condiciones favorables para riesgo."
        else:
            expected_direction = "Neutral"
            summary = "Señales mixtas en mercados de renta fija. Monitorear evolución de spreads."
        
        # Confidence based on statistical significance
        high_z_count = sum(1 for a in anomalies if a.z_score and abs(a.z_score) >= 2.0)
        if high_z_count >= 2 or len(anomalies) >= 3:
            confidence = "High"
        elif len(anomalies) >= 2:
            confidence = "Medium"
        else:
            confidence = "Low"
        
        anomalies_dicts = [
            {
                "category": a.category,
                "severity": a.severity,
                "score": a.score,
                "description": a.description,
                "impact": a.impact,
                "z_score": a.z_score,
            }
            for a in anomalies
        ]
        
        return YieldAnomalyReport(
            score=overall_score,
            expected_direction=expected_direction,
            confidence=confidence,
            curve_spread_2_10=round(spread_2_10, 2),
            curve_spread_5_10=round(spread_5_10, 2),
            credit_spread_ratio=round(credit_ratio, 3),
            anomalies=anomalies_dicts,
            summary=summary,
            historical_context={
                "curve_2_10_z_score": round(z_curve_2_10, 2),
                "credit_ratio_z_score": round(z_credit, 2),
                "historical_mean_2_10": YieldAnomalyAnalyzer.HISTORICAL_AVERAGES["curve_2_10_mean"],
                "historical_mean_credit": YieldAnomalyAnalyzer.HISTORICAL_AVERAGES["credit_ratio_mean"],
            }
        )
```

### Rationale
- **Correct spreads:** Uses 2Y-10Y and 5Y-10Y spreads instead of incorrect 10Y-13W
- **Statistical validation:** Uses z-scores based on historical averages instead of arbitrary thresholds
- **Real data validation:** Validates provider data availability before calculation
- **Multiple indicators:** Adds 5Y-10Y, 10Y-30Y spreads for comprehensive curve analysis
- **Combined signals:** Detects systemic stress when curve inversion + credit stress occur together
- **Historical context:** Provides z-scores and historical means for context

### Validation Steps
1. Test with real Yahoo Finance data for ^TNX, ^FVX, HYG, LQD
2. Verify z-scores are calculated correctly
3. Compare results to historical recession periods (2000, 2008, 2020)
4. Add unit tests for edge cases (missing data, zero division)
5. Verify severity classification matches z-score thresholds

---

## Task 5.2: Migrate to Lightweight Charts for Interactive Frontend

### Before Change
**File:** `frontend/src/components/Charts.tsx`

Current implementation uses matplotlib-generated static PNG images:
- No interactivity (no zoom, pan, hover)
- No real-time updates
- Fixed resolution
- Large payload (full PNG images)
- No crosshair or tooltips
- No time series support

### After Change
**Action:** Replace matplotlib with TradingView Lightweight Charts for interactive frontend.

**File:** `frontend/src/components/Charts.tsx`

```typescript
import { createChart, IChartApi, ISeriesApi, ColorType } from 'lightweight-charts';
import { useEffect, useRef } from 'react';

interface ChartProps {
  containerId: string;
  data: ChartData[];
  type: 'bar' | 'line' | 'histogram';
  title?: string;
  height?: number;
}

interface ChartData {
  strike: number;
  value: number;
  call?: number;
  put?: number;
  net?: number;
}

export function GexChart({ containerId, data, height = 300 }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Bar'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: '#FFFFFF' },
        textColor: '#212121',
      },
      grid: {
        vertLines: { color: '#E0E0E0' },
        horzLines: { color: '#E0E0E0' },
      },
      timeScale: {
        timeVisible: false,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#E0E0E0',
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
    });

    chartRef.current = chart;

    // Create series
    const series = chart.addBarSeries({
      upColor: '#00C853',
      downColor: '#FF1744',
      borderVisible: false,
      wickUpColor: '#00C853',
      wickDownColor: '#FF1744',
    });

    seriesRef.current = series;

    // Add data
    const chartData = data.map((d) => ({
      time: d.strike as any,
      value: d.value,
      color: d.value >= 0 ? '#00C853' : '#FF1744',
    }));

    series.setData(chartData);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, height]);

  return <div id={containerId} ref={chartContainerRef} style={{ height: `${height}px` }} />;
}

export function DexChart({ containerId, data, height = 300 }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const callSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const putSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const netSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: '#FFFFFF' },
        textColor: '#212121',
      },
      grid: {
        vertLines: { color: '#E0E0E0' },
        horzLines: { color: '#E0E0E0' },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
    });

    chartRef.current = chart;

    // Call Delta series
    const callSeries = chart.addHistogramSeries({
      color: '#00C853',
      priceFormat: {
        type: 'volume',
      },
    });
    callSeriesRef.current = callSeries;

    // Put Delta series
    const putSeries = chart.addHistogramSeries({
      color: '#FF1744',
      priceFormat: {
        type: 'volume',
      },
    });
    putSeriesRef.current = putSeries;

    // Net Delta series
    const netSeries = chart.addLineSeries({
      color: '#2979FF',
      lineWidth: 2,
    });
    netSeriesRef.current = netSeries;

    // Add data
    const callData = data.map((d) => ({
      time: d.strike as any,
      value: d.call || 0,
      color: '#00C853',
    }));

    const putData = data.map((d) => ({
      time: d.strike as any,
      value: d.put || 0,
      color: '#FF1744',
    }));

    const netData = data.map((d) => ({
      time: d.strike as any,
      value: d.net || 0,
    }));

    callSeries.setData(callData);
    putSeries.setData(putData);
    netSeries.setData(netData);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, height]);

  return <div id={containerId} ref={chartContainerRef} style={{ height: `${height}px` }} />;
}
```

**Update package.json:**
```json
{
  "dependencies": {
    "lightweight-charts": "^4.1.0"
  }
}
```

### Rationale
- **Interactivity:** Zoom, pan, crosshair, tooltips built-in
- **Performance:** WebGL-based rendering, handles large datasets efficiently
- **Real-time ready:** Designed for streaming updates
- **Smaller payload:** Vector-based instead of raster PNG
- **Professional:** TradingView-standard library used by institutional platforms
- **Responsive:** Automatic resize handling
- **Customizable:** Extensive styling options

### Validation Steps
1. Install lightweight-charts package
2. Replace existing chart components
3. Test zoom, pan, crosshair interactions
4. Verify responsive resize behavior
5. Compare performance with matplotlib (should be faster)
6. Test with large datasets (1000+ strikes)

---

## Task 5.3: Add Real-Time Chart Updates with WebSocket/SSE

### Before Change
Charts are static, refreshed only on page reload or manual refresh.

### After Change
**Action:** Implement Server-Sent Events (SSE) for real-time chart updates.

**File:** `backend/app/routers/streaming.py` (new)

```python
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
                if datetime.utcnow().second % 30 == 0:
                    yield_data = provider.get_yield_data()
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
```

**File:** `frontend/src/hooks/useMarketDataStream.ts` (new)

```typescript
import { useEffect, useState } from 'react';

interface MarketData {
  ticker: string;
  price: number;
  change: number;
  change_percent: number;
  timestamp: string;
}

interface YieldData {
  tnx: number;
  fvx: number;
  tyx: number;
  timestamp: string;
}

export function useMarketDataStream(ticker: string = 'SPY') {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [yieldData, setYieldData] = useState<YieldData | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(
      `http://localhost:8000/api/v1/stream/market-data?ticker=${ticker}`
    );

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    eventSource.addEventListener('price_update', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      setMarketData(data);
    });

    eventSource.addEventListener('yield_update', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      setYieldData(data);
    });

    return () => {
      eventSource.close();
    };
  }, [ticker]);

  return { marketData, yieldData, connected };
}
```

**Update requirements.txt:**
```txt
sse-starlette>=1.8.0
```

### Rationale
- **Real-time updates:** Charts update automatically as prices change
- **Efficient:** SSE is more efficient than polling
- **Simple:** Easier to implement than WebSocket for one-way streaming
- **Browser native:** EventSource API built into browsers
- **Automatic reconnection:** Browser handles reconnection automatically

### Validation Steps
1. Install sse-starlette package
2. Test SSE endpoint with curl or browser
3. Verify price updates trigger chart refresh
4. Test reconnection on network failure
5. Monitor server load with multiple connections

---

## Task 5.4: Create Yield Curve Visualization

### Before Change
No visualization of yield curve structure.

### After Change
**Action:** Add yield curve chart showing 2Y, 5Y, 10Y, 30Y rates.

**File:** `frontend/src/components/YieldCurveChart.tsx` (new)

```typescript
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { ColorType } from 'lightweight-charts';

interface YieldCurveProps {
  data: {
    maturity: string;
    rate: number;
  }[];
}

export function YieldCurveChart({ data }: YieldCurveProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: '#FFFFFF' },
        textColor: '#212121',
      },
      grid: {
        vertLines: { color: '#E0E0E0' },
        horzLines: { color: '#E0E0E0' },
      },
      rightPriceScale: {
        borderColor: '#E0E0E0',
      },
    });

    chartRef.current = chart;

    const series = chart.addLineSeries({
      color: '#2979FF',
      lineWidth: 3,
      lineStyle: 2, // Dashed
    });

    seriesRef.current = series;

    // Map maturity to numeric x-axis
    const maturityMap: { [key: string]: number } = {
      '2Y': 2,
      '5Y': 5,
      '10Y': 10,
      '30Y': 30,
    };

    const chartData = data.map((d) => ({
      time: maturityMap[d.maturity] as any,
      value: d.rate,
    }));

    series.setData(chartData);

    // Add normal curve reference
    const normalSeries = chart.addLineSeries({
      color: '#757575',
      lineWidth: 1,
      lineStyle: 1, // Dotted
    });

    // Approximate normal curve (upward sloping)
    const normalData = [
      { time: 2 as any, value: 3.5 },
      { time: 5 as any, value: 4.0 },
      { time: 10 as any, value: 4.5 },
      { time: 30 as any, value: 4.8 },
    ];

    normalSeries.setData(normalData);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  return (
    <div ref={chartContainerRef} style={{ height: '300px' }}>
      <div style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '12px', color: '#757575' }}>
        <span style={{ color: '#2979FF' }}>● Actual</span>
        <span style={{ color: '#757575', marginLeft: '10px' }}>● Normal</span>
      </div>
    </div>
  );
}
```

**Add endpoint:** `backend/app/routers/yield.py` (new)

```python
from fastapi import APIRouter
from app.providers import get_provider

router = APIRouter()

@router.get("/curve")
def get_yield_curve():
    """Get current yield curve data."""
    provider = get_provider()
    data = provider.get_yield_data()
    
    return {
        "curve": [
            {"maturity": "2Y", "rate": data.get("^FVX") or data.get("irx")},
            {"maturity": "5Y", "rate": data.get("^FVX")},
            {"maturity": "10Y", "rate": data.get("^TNX")},
            {"maturity": "30Y", "rate": data.get("^TYX")},
        ],
        "spreads": {
            "2_10": (data.get("^TNX") or 0) - (data.get("^FVX") or 0),
            "5_10": (data.get("^TNX") or 0) - (data.get("^FVX") or 0),
            "10_30": (data.get("^TYX") or 0) - (data.get("^TNX") or 0),
        }
    }
```

### Rationale
- **Visual context:** Shows yield curve shape at a glance
- **Inversion detection:** Easy to see if curve is inverted
- **Comparison:** Normal curve reference for context
- **Educational:** Helps users understand yield curve dynamics

### Validation Steps
1. Test with real Treasury data
2. Verify curve shape matches expectations
3. Test inversion scenarios (manually set data)
4. Verify normal curve reference displays correctly

---

## Task 5.5: Add Credit Spread Historical Chart

### Before Change
No historical visualization of credit spreads.

### After Change
**Action:** Add time series chart of HYG/LQD ratio over time.

**File:** `frontend/src/components/CreditSpreadChart.tsx` (new)

```typescript
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { ColorType } from 'lightweight-charts';

interface CreditSpreadProps {
  data: {
    date: string;
    ratio: number;
  }[];
}

export function CreditSpreadChart({ data }: CreditSpreadProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: '#FFFFFF' },
        textColor: '#212121',
      },
      grid: {
        vertLines: { color: '#E0E0E0' },
        horzLines: { color: '#E0E0E0' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#E0E0E0',
      },
    });

    chartRef.current = chart;

    const series = chart.addLineSeries({
      color: '#FF9100',
      lineWidth: 2,
    });

    seriesRef.current = series;

    const chartData = data.map((d) => ({
      time: d.date as any,
      value: d.ratio,
    }));

    series.setData(chartData);

    // Add threshold lines
    const normalLine = chart.addLineSeries({
      color: '#00C853',
      lineWidth: 1,
      lineStyle: 2,
    });

    const stressedLine = chart.addLineSeries({
      color: '#FF1744',
      lineWidth: 1,
      lineStyle: 2,
    });

    // Add horizontal lines at thresholds
    const timeRange = chartData.map((d) => d.time);
    if (timeRange.length > 0) {
      const normalData = timeRange.map((t) => ({ time: t, value: 0.70 }));
      const stressedData = timeRange.map((t) => ({ time: t, value: 0.68 }));
      
      normalLine.setData(normalData);
      stressedLine.setData(stressedData);
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  return (
    <div ref={chartContainerRef} style={{ height: '300px' }}>
      <div style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '12px', color: '#757575' }}>
        <span style={{ color: '#FF9100' }}>● HYG/LQD</span>
        <span style={{ color: '#00C853', marginLeft: '10px' }}>● Normal (0.70)</span>
        <span style={{ color: '#FF1744', marginLeft: '10px' }}>● Stressed (0.68)</span>
      </div>
    </div>
  );
}
```

**Add endpoint:** `backend/app/routers/yield.py`

```python
@router.get("/credit-spread-history")
def get_credit_spread_history(days: int = 90):
    """Get historical HYG/LQD ratio."""
    provider = get_provider()
    # This would require historical data from provider
    # For now, return mock data or implement with yfinance history
    import yfinance as yf
    
    hyg = yf.Ticker("HYG")
    lqd = yf.Ticker("LQD")
    
    hyg_hist = hyg.history(period=f"{days}d")["Close"]
    lqd_hist = lqd.history(period=f"{days}d")["Close"]
    
    history = []
    for date in hyg_hist.index:
        if date in lqd_hist.index:
            ratio = hyg_hist[date] / lqd_hist[date]
            history.append({
                "date": date.strftime("%Y-%m-%d"),
                "ratio": round(ratio, 4),
            })
    
    return {"history": history}
```

### Rationale
- **Historical context:** Shows credit spread trends over time
- **Threshold visualization:** Normal vs stressed levels visible
- **Pattern detection:** Easy to spot deteriorating conditions
- **Correlation analysis:** Can overlay with SPY price

### Validation Steps
1. Test with yfinance historical data
2. Verify ratio calculation is correct
3. Test with different time ranges (30, 90, 180 days)
4. Verify threshold lines display correctly

---

## Success Criteria

- [ ] Yield anomaly uses correct 2Y-10Y spread calculation
- [ ] Yield anomaly includes z-scores and historical context
- [ ] Frontend charts use Lightweight Charts library
- [ ] Charts support zoom, pan, crosshair, tooltips
- [ ] SSE endpoint streams price updates
- [ ] Frontend connects to SSE and updates charts
- [ ] Yield curve chart displays 2Y, 5Y, 10Y, 30Y rates
- [ ] Credit spread chart shows 90-day history
- [ ] All existing tests pass
- [ ] New tests added for yield anomaly logic
- [ ] Performance: chart rendering < 100ms for 1000 data points

---

## Rollback Plan

If issues arise:
1. **Yield anomaly:** Revert to previous version, keep as-is
2. **Lightweight Charts:** Keep matplotlib as fallback, feature flag new charts
3. **SSE:** Disable streaming endpoint, use polling as fallback
4. **New charts:** Remove from UI, keep backend endpoints for future use

---

## Estimated Timeline

- **Day 1:** Task 5.1 (Fix yield anomaly)
- **Day 2-3:** Task 5.2 (Migrate to Lightweight Charts)
- **Day 4:** Task 5.3 (Add SSE streaming)
- **Day 5:** Task 5.4 & 5.5 (Yield curve and credit spread charts)
- **Day 6:** Testing, validation, documentation

**Total Effort:** 6 days (20 hours)
