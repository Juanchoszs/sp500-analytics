/**
 * Gexbot-style Gamma Analysis page
 * Based on functional Gamma.tsx component with enhanced features
 */

import { useState, useEffect } from "react";
import { marketApi } from "../api/client";
import { Download, Info, Activity, TrendingUp, AlertTriangle, Target, Database } from "lucide-react";
import { useReportDownload } from "../hooks/useReportDownload";
import GammaHistogram from "../gamma/charts/GammaHistogram";
import LoadingState from "../components/ui/LoadingState";
import ErrorState from "../components/ui/ErrorState";
import Card from "../components/ui/Card";
import type { ExposureResponse, ExpirationsResponse } from "../types";
import type { StrikeGammaData } from "../gamma/types/gammaTypes";

const TICKER = "SPY";

export default function GammaGexbot() {
  const [expirations, setExpirations] = useState<ExpirationsResponse | null>(null);
  const [selectedExp, setSelectedExp] = useState<string | undefined>(undefined);
  const [exposure, setExposure] = useState<ExposureResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [strikes, setStrikes] = useState<StrikeGammaData[]>([]);
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
        .then((data) => {
          setExposure(data);
          
          // Convertir datos backend a formato histograma usando valores reales
          if (data.strikes && data.strikes.length > 0) {
            const histogramStrikes: StrikeGammaData[] = data.strikes.map(s => ({
              strike: s.strike,
              callGamma: s.call_gamma_exposure || 0,
              putGamma: s.put_gamma_exposure || 0,
              netGamma: (s.call_gamma_exposure || 0) - (s.put_gamma_exposure || 0),
              callGex: (s.call_gamma_exposure || 0) * s.strike,
              putGex: (s.put_gamma_exposure || 0) * s.strike,
              netGex: ((s.call_gamma_exposure || 0) - (s.put_gamma_exposure || 0)) * s.strike,
              openInterestGamma: s.gamma_exposure || 0,
              volumeGamma: 0, // backend no tiene esto explícito, usar 0
              timestamp: new Date(),
            }));
            setStrikes(histogramStrikes);
          }
        })
        .catch((err) => {
          setError(err?.message ?? "Error al consultar la API");
          setUsingFallback(true);
        })
        .finally(() => setLoading(false));
    };

    fetchExposure();
    const interval = setInterval(fetchExposure, 60000);
    return () => clearInterval(interval);
  }, [selectedExp]);

  const getGammaRegimeColor = () => {
    if (!exposure) return "text-text-tertiary";
    return exposure.net_gamma_exposure > 0 ? "text-success" : "text-danger";
  };

  const getGammaRegimeLabel = () => {
    if (!exposure) return "Unknown";
    return exposure.net_gamma_exposure > 0 ? "Long Gamma" : "Short Gamma";
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-wrap gap-3 shadow-lg">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-accent to-ring flex items-center justify-center shadow-lg border border-white/10">
            <span className="font-bold text-white text-lg sm:text-xl">Γ</span>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Gamma Analysis (Gexbot Style)</h1>
            <div className="font-mono text-[10px] sm:text-xs text-dim/70 uppercase tracking-wider mt-0.5">
              {TICKER} Options Market Structure Analysis
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <button
            onClick={() => handleDownloadWord(TICKER, selectedExp)}
            disabled={isDownloading || !exposure}
            className="flex items-center gap-2 bg-secondary border border-border hover:border-accent text-xs sm:text-sm font-mono px-3 sm:px-4 py-2 rounded-lg transition-all text-foreground disabled:opacity-50 disabled:cursor-not-allowed group focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-primary"
            aria-label="Descargar reporte de análisis Gamma"
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
            <p className="text-foreground font-medium mb-1">Modo Gexbot - Análisis en Tiempo Real</p>
            <p className="text-dim/70">
              Análisis gamma de {TICKER} con actualización cada 1 minuto. Funciona con mercado cerrado mostrando últimos datos disponibles.
            </p>
          </div>
        </div>
      </div>

      {usingFallback && (
        <div className="mx-6 mt-6 border border-warning/40 bg-warning/10 text-warning text-sm p-4 rounded-lg font-mono flex items-center gap-3 shadow-lg">
          <Database className="w-4 h-4" />
          Modo degradado: Usando datos de fallback debido a errores en la API. Verifica que el backend esté corriendo en :8000.
        </div>
      )}

      {error && !usingFallback && (
        <div className="mx-6 mt-6 border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4 rounded-lg font-mono flex items-center gap-3 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          Error consultando la API: {error}. Verifica que el backend esté corriendo en :8000.
        </div>
      )}

      {loading && !exposure && (
        <div className="p-20 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
          <div className="font-mono text-dim/70 text-sm uppercase tracking-wider animate-pulse">Analizando estructura de opciones...</div>
        </div>
      )}

      {exposure && (
        <main className="flex-1 p-8 flex flex-col gap-8">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6" role="region" aria-label="Métricas clave de Gamma">
            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-accent" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Net Gamma</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                ${!isNaN(exposure.net_gamma_exposure) ? (exposure.net_gamma_exposure / 1000000).toFixed(1) : 'N/A'}M
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">
                {exposure.net_gamma_exposure > 0 ? "Régimen Long Gamma (estabilizador)" : "Régimen Short Gamma (desestabilizador)"}
              </p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-accent" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Net Delta</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                ${!isNaN(exposure.net_delta_exposure) ? (exposure.net_delta_exposure / 1000000).toFixed(1) : 'N/A'}M
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">
                {exposure.net_delta_exposure > 0 ? "Flujo comprador neto" : "Flujo vendedor neto"}
              </p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-accent" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Call Wall</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                {exposure.call_wall ? `$${exposure.call_wall}` : 'N/A'}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">
                Nivel de resistencia magnética para dealers
              </p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-accent" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Put Wall</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                {exposure.put_wall ? `$${exposure.put_wall}` : 'N/A'}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">
                Nivel de soporte definitivo para dealers
              </p>
            </Card>
          </div>

          {/* Real-time Status */}
          <div className="bg-secondary/30 border border-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-mono text-dim/70">REAL-TIME UPDATES (1m)</span>
              </div>
              <div className="text-xs font-mono text-dim/70">
                Ticker: <span className="text-foreground">{TICKER}</span>
              </div>
            </div>
            <div className="text-xs font-mono text-dim/70">
              Gamma Regime: <span className={getGammaRegimeColor()}>{getGammaRegimeLabel()}</span>
            </div>
          </div>

          {/* GEXBOT Classic Gamma Histogram */}
          {strikes.length > 0 ? (
            <div className="bg-secondary/20 border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Gamma Histogram (GEXBOT Style)</span>
                  <span className="text-xs text-dim/50 font-mono">Net Gamma per Strike</span>
                </div>
              </div>
              <div className="p-4">
                <GammaHistogram
                  strikes={strikes}
                  spotPrice={exposure.spot_price}
                  zeroGamma={exposure.zero_gamma}
                  callWall={exposure.call_wall}
                  putWall={exposure.put_wall}
                  width={800}
                  height={400}
                />
              </div>
            </div>
          ) : (
            <div className="bg-secondary/20 border border-border rounded-lg p-8 text-center">
              <div className="text-dim/70 text-sm mb-2">
                No strike data available
              </div>
              <div className="text-dim/50 text-xs">
                Waiting for gamma data from backend
              </div>
            </div>
          )}

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6" role="region" aria-label="Métricas clave de Gamma">
            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-accent" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Net Gamma</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                ${!isNaN(exposure.net_gamma_exposure) ? (exposure.net_gamma_exposure / 1000000).toFixed(1) : 'N/A'}M
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">
                {exposure.net_gamma_exposure > 0 ? "Régimen Long Gamma (estabilizador)" : "Régimen Short Gamma (desestabilizador)"}
              </p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-accent" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Net Delta</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                ${!isNaN(exposure.net_delta_exposure) ? (exposure.net_delta_exposure / 1000000).toFixed(1) : 'N/A'}M
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">
                {exposure.net_delta_exposure > 0 ? "Flujo comprador neto" : "Flujo vendedor neto"}
              </p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-accent" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Call Wall</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                {exposure.call_wall ? `$${exposure.call_wall}` : 'N/A'}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">
                Nivel de resistencia magnética para dealers
              </p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-accent" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Put Wall</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                {exposure.put_wall ? `$${exposure.put_wall}` : 'N/A'}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">
                Nivel de soporte definitivo para dealers
              </p>
            </Card>
          </div>
        </main>
      )}
    </div>
  );
}