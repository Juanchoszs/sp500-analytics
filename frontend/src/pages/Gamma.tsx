import { useState, useEffect } from "react";
import { marketApi } from "../api/client";
import { Download, Info, Shield, Activity, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { useReportDownload } from "../hooks/useReportDownload";
import StrikeBarsChart from "../components/StrikeBarsChart";
import MultiLayerHeatmap from "../components/MultiLayerHeatmap";
import AutomaticAnalysisPanel from "../components/AutomaticAnalysisPanel";
import LoadingState from "../components/ui/LoadingState";
import ErrorState from "../components/ui/ErrorState";
import Card from "../components/ui/Card";
import type { ExposureResponse, ExpirationsResponse } from "../types";

const TICKER = "SPY"; // Do not change to ^GSPC; the backend automatically handles GSPC conversion when TICKER="SPY"

export default function Gamma() {
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
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Gamma Analysis</h1>
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
            <p className="text-foreground font-medium mb-1">¿Qué es este módulo?</p>
            <p className="text-dim/70">
              Analiza la estructura de opciones de {TICKER} para identificar niveles clave donde los dealers (creadores de mercado) deben cubrir sus posiciones. 
              El <strong className="text-accent">Call Wall</strong> actúa como resistencia magnética, el <strong className="text-destructive">Put Wall</strong> como soporte definitivo, 
              y el <strong className="text-warning">Zero Gamma</strong> marca el punto de inflexión de volatilidad. Esta información es crucial para entender movimientos intradía y niveles de pinning.
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
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-success" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Call Wall</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                ${exposure.call_wall && !isNaN(exposure.call_wall) ? exposure.call_wall : 'N/A'}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">Resistencia magnética principal</p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-danger" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Put Wall</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                ${exposure.put_wall && !isNaN(exposure.put_wall) ? exposure.put_wall : 'N/A'}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">Soporte definitivo del día</p>
            </Card>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mt-2">
            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Zero Gamma</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white mb-2" aria-live="polite">
                ${exposure.zero_gamma && !isNaN(exposure.zero_gamma) ? exposure.zero_gamma : 'N/A'}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">Punto de inflexión de volatilidad</p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-info" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Max Pain</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white mb-2" aria-live="polite">
                ${exposure.max_pain && !isNaN(exposure.max_pain) ? exposure.max_pain : 'N/A'}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">Punto de máximo dolor para compradores</p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Put/Call OI</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white mb-2" aria-live="polite">
                {!isNaN(exposure.put_call_oi_ratio) ? exposure.put_call_oi_ratio.toFixed(2) : 'N/A'}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">Ratio put/call open interest</p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-info" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Spot Price</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white mb-2" aria-live="polite">
                ${exposure.spot_price && !isNaN(exposure.spot_price) ? exposure.spot_price.toFixed(2) : 'N/A'}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">Precio actual {TICKER}</p>
            </Card>
          </div>

          {/* Main Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mt-4">
            <Card variant="chart" className="h-[400px] lg:h-[450px]">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-white mb-1">Gamma Profile</h3>
                <p className="text-xs text-text-tertiary uppercase tracking-wider">Exposición por strike</p>
              </div>
              <StrikeBarsChart 
                strikes={exposure.strikes} 
                spotPrice={exposure.spot_price} 
                callWall={exposure.call_wall} 
                putWall={exposure.put_wall} 
                zeroGamma={exposure.zero_gamma}
                indexPrice={exposure.index_price}
                indexTicker={exposure.index_ticker}
              />
            </Card>

            <Card variant="chart" className="h-[400px] lg:h-[450px]">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-white mb-1">Gamma Heatmap</h3>
                <p className="text-xs text-text-tertiary uppercase tracking-wider">Distribución de exposición</p>
              </div>
              <MultiLayerHeatmap exposure={exposure} />
            </Card>
          </div>

          {/* Analysis Panel */}
          <div className="mt-8">
            <Card variant="narrative">
              <AutomaticAnalysisPanel exposure={exposure} />
            </Card>
          </div>
        </main>
      )}
    </div>
  );
}