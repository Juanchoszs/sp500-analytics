import { useState, useEffect } from "react";
import { marketApi } from "../api/client";
import { Download, Info, TrendingUp, Shield, Activity } from "lucide-react";
import { useReportDownload } from "../hooks/useReportDownload";
import StrikeBarsChart from "./StrikeBarsChart";

import MultiLayerHeatmap from "./MultiLayerHeatmap";
import MarketProfilePanel from "./MarketProfilePanel";
import AutomaticAnalysisPanel from "./AutomaticAnalysisPanel";
import type { ExposureResponse, ExpirationsResponse } from "../types";

const TICKER = "SPY";

export default function GammaExposureView() {
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
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary border-b border-border px-6 py-4 flex items-center justify-between flex-wrap gap-3 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-ring flex items-center justify-center shadow-lg border border-white/10">
            <span className="font-bold text-white text-xl">G</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Gamma Exposure Module</h1>
            <div className="font-mono text-xs text-dim/70 uppercase tracking-wider mt-0.5">
              {exposure?.display_ticker || TICKER} Options Market Structure Analysis
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => handleDownloadWord(TICKER, selectedExp)}
            disabled={isDownloading || !exposure}
            className="flex items-center gap-2 bg-secondary border border-border hover:border-accent text-sm font-mono px-4 py-2 rounded-lg transition-all text-foreground disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
            )}
            Descargar Reporte
          </button>
          <div className="h-8 w-px bg-border" />
          <label className="font-mono text-xs text-dim/70 uppercase tracking-wider">Vencimiento</label>
          <select
            className="bg-secondary border border-border rounded-lg text-foreground font-mono text-sm px-4 py-2 outline-none focus:border-accent transition-colors"
            value={selectedExp ?? ""}
            onChange={(e) => setSelectedExp(e.target.value || undefined)}
          >
            <option value="">Nearest</option>
            {expirations?.expirations.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Info Bar */}
      <div className="bg-secondary/30 border-b border-border px-6 py-3">
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
        <main className="flex-1 p-6 flex flex-col gap-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-accent" />
                <span className="font-mono text-xs text-dim/70 uppercase">Net Gamma</span>
              </div>
              <div className="text-2xl font-bold text-white">
                ${(exposure.net_gamma_exposure / 1000000).toFixed(1)}M
              </div>
              <p className="text-xs text-dim/70 mt-1">
                {exposure.net_gamma_exposure > 0 ? "Régimen Long Gamma (estabilizador)" : "Régimen Short Gamma (desestabilizador)"}
              </p>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="font-mono text-xs text-dim/70 uppercase">Net Delta</span>
              </div>
              <div className="text-2xl font-bold text-white">
                ${(exposure.net_delta_exposure / 1000000).toFixed(1)}M
              </div>
              <p className="text-xs text-dim/70 mt-1">
                {exposure.net_delta_exposure > 0 ? "Flujo comprador neto" : "Flujo vendedor neto"}
              </p>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-accent" />
                <span className="font-mono text-xs text-dim/70 uppercase">Call Wall</span>
              </div>
              <div className="text-2xl font-bold text-white">
                ${exposure.call_wall || 'N/A'}
              </div>
              <p className="text-xs text-dim/70 mt-1">Resistencia magnética principal</p>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-destructive" />
                <span className="font-mono text-xs text-dim/70 uppercase">Put Wall</span>
              </div>
              <div className="text-2xl font-bold text-white">
                ${exposure.put_wall || 'N/A'}
              </div>
              <p className="text-xs text-dim/70 mt-1">Soporte definitivo del día</p>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            {/* Left: Strike Bars Chart */}
            <div className="lg:col-span-4 card">
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <h3 className="font-bold text-lg text-foreground">Strike Gamma & Delta Bars</h3>
              </div>
              <div className="text-xs text-dim/70 mb-4">
                Distribución de gamma (verde/rojo) y delta (azul/púrpura) por strike. Los niveles clave están marcados con líneas punteadas.
              </div>
              <StrikeBarsChart
                strikes={exposure.strikes}
                spotPrice={exposure.spot_price}
                callWall={exposure.call_wall}
                putWall={exposure.put_wall}
                zeroGamma={exposure.zero_gamma}
              />
            </div>

            {/* Center: Multi-layer Heatmap */}
            <div className="lg:col-span-5 card">
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <h3 className="font-bold text-lg text-foreground">Market Structure Heatmap</h3>
              </div>
              <div className="text-xs text-dim/70 mb-4">
                Visualización multi-capa de la estructura de mercado. Activa/desactiva capas para analizar diferentes componentes.
              </div>
              <MultiLayerHeatmap
                exposure={exposure}
              />
            </div>

            {/* Right: Market Profile Panel */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              <MarketProfilePanel exposure={exposure} />
              <AutomaticAnalysisPanel exposure={exposure} />
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
