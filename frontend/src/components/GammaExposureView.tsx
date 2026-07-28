import { useState, useEffect } from "react";
import { marketApi } from "../api/client";
import { Download } from "lucide-react";
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
  const [isDownloading, setIsDownloading] = useState(false);

  // Control states
  const [showOnlyPositive, setShowOnlyPositive] = useState(false);
  const [showOnlyNegative, setShowOnlyNegative] = useState(false);
  const [activeLayers, setActiveLayers] = useState({
    heatmap: true,
    spot: true,
    candlestick: true,
    gammaFlip: true,
    putWall: true,
    callWall: true,
    highestGamma: true,
    zeroGamma: true,
  });

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

  const handleDownloadWord = async () => {
    try {
      setIsDownloading(true);
      const blob = await marketApi.downloadReport({ ticker: TICKER, expiration: selectedExp });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `SPY_Gamma_Exposure_${selectedExp || "Nearest"}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      console.error(e);
      alert("Error al descargar el reporte.");
    } finally {
      setIsDownloading(false);
    }
  };

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
              {TICKER} Options Market Structure
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={handleDownloadWord}
            disabled={isDownloading || !exposure}
            className="flex items-center gap-2 bg-secondary border border-border hover:border-accent text-sm font-mono px-4 py-2 rounded-lg transition-all text-foreground disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
            )}
            Descargar Reporte Word
          </button>
          <div className="h-8 w-px bg-border" />
          <label className="font-mono text-xs text-dim/70 uppercase tracking-wider">Exp</label>
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

      {/* Controls Row */}
      <div className="bg-secondary/50 border-b border-border px-6 py-3">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs uppercase text-dim/70">Filtros</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showOnlyPositive} onChange={(e) => { setShowOnlyPositive(e.target.checked); if (e.target.checked) setShowOnlyNegative(false); }} className="accent-accent" />
              <span className="text-xs font-mono">Solo Gamma Positivo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showOnlyNegative} onChange={(e) => { setShowOnlyNegative(e.target.checked); if (e.target.checked) setShowOnlyPositive(false); }} className="accent-destructive" />
              <span className="text-xs font-mono">Solo Gamma Negativo</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs uppercase text-dim/70">Capas</span>
            {Object.entries(activeLayers).map(([key, active]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={active} onChange={(e) => setActiveLayers(prev => ({ ...prev, [key]: e.target.checked }))} className="accent-accent" />
                <span className="text-xs font-mono capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              </label>
            ))}
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
          <div className="font-mono text-dim/70 text-sm uppercase tracking-wider animate-pulse">Analizando estructura...</div>
        </div>
      )}

      {exposure && (
        <main className="flex-1 p-6 flex flex-col gap-6">
          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            {/* Left: Strike Bars Chart */}
            <div className="lg:col-span-3 card">
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <h3 className="font-bold text-lg text-foreground">Strike Gamma Bars</h3>
              </div>
              <StrikeBarsChart
                strikes={exposure.strikes}
                spotPrice={exposure.spot_price}
                callWall={exposure.call_wall}
                putWall={exposure.put_wall}
                zeroGamma={exposure.zero_gamma}
                showOnlyPositive={showOnlyPositive}
                showOnlyNegative={showOnlyNegative}
              />
            </div>

            {/* Center: Multi-layer Heatmap */}
            <div className="lg:col-span-6 card">
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <h3 className="font-bold text-lg text-foreground">Market Structure Heatmap</h3>
              </div>
              <MultiLayerHeatmap
                exposure={exposure}
                activeLayers={activeLayers}
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
