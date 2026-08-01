import { useState, useEffect } from "react";
import { marketApi } from "../api/client";
import { Download, Info, Activity, TrendingUp, Droplets, BarChart3 } from "lucide-react";
import { useReportDownload } from "../hooks/useReportDownload";
import LiquidityProfileChart from "../components/LiquidityProfileChart";
import LiquidityDepthChart from "../components/LiquidityDepthChart";
import LiquidityRegimePanel from "../components/LiquidityRegimePanel";
import LoadingState from "../components/ui/LoadingState";
import ErrorState from "../components/ui/ErrorState";
import Card from "../components/ui/Card";
import type { ExposureResponse, ExpirationsResponse } from "../types";

const TICKER = "SPY";

export default function Liquidity() {
  const [expirations, setExpirations] = useState<ExpirationsResponse | null>(null);
  const [selectedExp, setSelectedExp] = useState<string | undefined>(undefined);
  const [exposure, setExposure] = useState<ExposureResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDownloading, handleDownloadWord } = useReportDownload();

  useEffect(() => {
    marketApi.getExpirations({ ticker: TICKER }).then(setExpirations).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    const fetchExposure = () => {
      setLoading(true);
      setError(null);
      const params = { ticker: TICKER, expiration: selectedExp };
      marketApi.getExposure(params)
        .then(setExposure)
        .catch((err) => setError(err?.message ?? "Error al consultar la API"))
        .finally(() => setLoading(false));
    };

    fetchExposure();
    const interval = setInterval(fetchExposure, 5000);
    return () => clearInterval(interval);
  }, [selectedExp]);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-wrap gap-3 shadow-lg">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-accent to-ring flex items-center justify-center shadow-lg border border-white/10">
            <Droplets className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Liquidity Analysis</h1>
            <div className="font-mono text-[10px] sm:text-xs text-dim/70 uppercase tracking-wider mt-0.5">
              {TICKER} Options Market Liquidity Analysis
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <button
            onClick={() => handleDownloadWord(TICKER, selectedExp)}
            disabled={isDownloading || !exposure}
            className="flex items-center gap-2 bg-secondary border border-border hover:border-accent text-xs sm:text-sm font-mono px-3 sm:px-4 py-2 rounded-lg transition-all text-foreground disabled:opacity-50 disabled:cursor-not-allowed group focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-primary"
            aria-label="Descargar reporte de análisis de Liquidez"
            aria-busy={isDownloading}
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" aria-hidden="true" />
            ) : (
              <Download className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">Descargar Reporte</span>
            <span className="sm:hidden">Descargar</span>
          </button>
          <div className="h-8 w-px bg-border hidden sm:block" />
          <label className="font-mono text-xs text-dim/70 uppercase tracking-wider hidden sm:block">Vencimiento</label>
          <select
            className="bg-secondary border border-border rounded-lg text-foreground font-mono text-xs sm:text-sm px-3 sm:px-4 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-primary transition-colors"
            value={selectedExp ?? ""}
            onChange={(e) => setSelectedExp(e.target.value || undefined)}
            aria-label="Seleccionar fecha de vencimiento de opciones"
          >
            <option value="">Nearest</option>
            {expirations?.expirations.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Info Bar */}
      <div className="bg-secondary/30 border-b border-border px-4 sm:px-6 py-3">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-foreground font-medium mb-1">¿Qué es este módulo?</p>
            <p className="text-dim/70">
              Analiza la profundidad y concentración de liquidez en el mercado de opciones de {TICKER}, identificando niveles donde existe mayor capacidad de ejecución sin impacto significativo en precios. 
              La <strong className="text-accent">liquidez</strong> es crucial para entender costos de transacción, riesgo de slippage, y la eficiencia general del mercado. Los strikes con alta liquidez ofrecen mejor ejecución y menores spreads.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-6 border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4 rounded-lg font-mono flex items-center gap-3 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          Error consultando la API: {error}. Verifica que el backend esté corriendo en :8000.
        </div>
      )}

      {loading && !exposure && (
        <div className="p-20 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
          <div className="font-mono text-dim/70 text-sm uppercase tracking-wider animate-pulse">Analizando liquidez del mercado...</div>
        </div>
      )}

      {exposure && (
        <main className="flex-1 p-8 flex flex-col gap-8">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6" role="region" aria-label="Métricas clave de Liquidez">
            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-accent" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Total OI</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                {exposure.strikes.reduce((acc, strike) => acc + strike.call_oi + strike.put_oi, 0).toLocaleString()}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">
                Open Interest total de opciones
              </p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-accent" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Total Volume</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                {exposure.strikes.reduce((acc, strike) => acc + strike.call_volume + strike.put_volume, 0).toLocaleString()}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">
                Volumen total de opciones
              </p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-accent" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Liquidity Ratio</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                {(() => {
                  const totalOi = exposure.strikes.reduce((acc, strike) => acc + strike.call_oi + strike.put_oi, 0);
                  const totalVol = exposure.strikes.reduce((acc, strike) => acc + strike.call_volume + strike.put_volume, 0);
                  return totalOi > 0 ? ((totalVol / totalOi) * 100).toFixed(1) + '%' : 'N/A';
                })()}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">
                Ratio Volume/OI (actividad relativa)
              </p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-accent" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">P/C OI Ratio</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                {exposure.put_call_oi_ratio.toFixed(2)}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">
                {exposure.put_call_oi_ratio > 1 ? "Sesgo bajista estructural" : "Sesgo alcista estructural"}
              </p>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <LiquidityProfileChart 
              strikes={exposure.strikes} 
              spotPrice={exposure.spot_price} 
              putCallOiRatio={exposure.put_call_oi_ratio}
            />
            <LiquidityDepthChart 
              strikes={exposure.strikes} 
              spotPrice={exposure.spot_price}
            />
          </div>

          {/* Liquidity Regime Panel */}
          <LiquidityRegimePanel
            strikes={exposure.strikes}
            spotPrice={exposure.spot_price}
            putCallOiRatio={exposure.put_call_oi_ratio}
            putCallVolumeRatio={exposure.put_call_volume_ratio}
          />

          {/* High Liquidity Zones */}
          <Card variant="narrative">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-white mb-1">High Liquidity Zones</h3>
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Niveles de mayor liquidez</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {exposure.high_liquidity_strikes.map((strike) => (
                <div key={strike} className="px-4 py-2 bg-surface-hover border border-border rounded-lg">
                  <span className="text-lg font-bold text-white">${strike}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-dim/60 mt-4">
              Estos strikes presentan la mayor concentración de open interest, ofreciendo la mejor capacidad de ejecución con menor impacto en precios.
            </p>
          </Card>
        </main>
      )}
    </div>
  );
}