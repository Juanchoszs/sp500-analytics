import { useState, useEffect } from "react";
import { marketApi } from "../api/client";
import { Download, Activity, TrendingUp } from "lucide-react";
import { useReportDownload } from "../hooks/useReportDownload";
import VolumeChart from "../components/VolumeChart";
import OpenInterestChart from "../components/OpenInterestChart";
import LoadingState from "../components/ui/LoadingState";
import ErrorState from "../components/ui/ErrorState";
import Card from "../components/ui/Card";
import type { ExposureResponse, ExpirationsResponse } from "../types";

const TICKER = "SPY";

export default function Flow() {
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
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">Flow Analysis</h1>
            <p className="text-sm text-text-secondary">
              Análisis de volumen, open interest y flujo de órdenes
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleDownloadWord(TICKER, selectedExp)}
              disabled={isDownloading || !exposure}
              className="flex items-center gap-2 bg-surface border border-border hover:border-border-light px-4 py-2 rounded-lg text-sm text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-border-light border-t-text-tertiary rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Descargar Reporte
            </button>
            <select
              className="bg-surface border border-border rounded-lg text-text-primary text-sm px-4 py-2 outline-none focus:border-border-light transition-colors"
              value={selectedExp ?? ""}
              onChange={(e) => setSelectedExp(e.target.value || undefined)}
            >
              <option value="">Nearest</option>
              {expirations?.expirations.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <ErrorState
          title="Error de conexión"
          message={error}
          action={{ label: "Reintentar", onClick: () => window.location.reload() }}
        />
      )}

      {loading && !exposure && (
        <LoadingState message="Analizando flujo de órdenes..." />
      )}

      {exposure && (
        <div className="flex flex-col gap-8">
          {/* Key Metrics - Flow específicos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-info" />
                <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Total Volume</span>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {exposure.strikes.reduce((acc, strike) => acc + strike.call_volume + strike.put_volume, 0).toLocaleString()}
              </div>
              <p className="text-sm text-text-secondary">Volumen total de opciones</p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-info" />
                <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Total OI</span>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {exposure.strikes.reduce((acc, strike) => acc + strike.call_oi + strike.put_oi, 0).toLocaleString()}
              </div>
              <p className="text-sm text-text-secondary">Open interest total</p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-success" />
                <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Put/Call OI</span>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {exposure.put_call_oi_ratio.toFixed(2)}
              </div>
              <p className="text-sm text-text-secondary">Ratio put/call OI</p>
            </Card>
          </div>

          {/* Flow Charts - Máximo 2-3 gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card variant="chart" className="h-[500px]">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-white mb-1">Volume Analysis</h3>
                <p className="text-xs text-text-tertiary uppercase tracking-wider">Volumen por strike</p>
              </div>
              <VolumeChart 
                strikes={exposure.strikes} 
                spotPrice={exposure.spot_price} 
                putCallVolumeRatio={exposure.put_call_volume_ratio} 
              />
            </Card>

            <Card variant="chart" className="h-[500px]">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-white mb-1">Open Interest Profile</h3>
                <p className="text-xs text-text-tertiary uppercase tracking-wider">Interés abierto por strike</p>
              </div>
              <OpenInterestChart 
                strikes={exposure.strikes} 
                spotPrice={exposure.spot_price} 
                putCallOiRatio={exposure.put_call_oi_ratio}
              />
            </Card>
          </div>

          {/* High Liquidity Strikes */}
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
          </Card>
        </div>
      )}
    </div>
  );
}