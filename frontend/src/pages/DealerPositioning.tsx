import { useState, useEffect } from "react";
import { marketApi } from "../api/client";
import { Download, Shield, TrendingUp, Activity } from "lucide-react";
import { useReportDownload } from "../hooks/useReportDownload";
import DeltaExposureChart from "../components/DeltaExposureChart";
import HedgingStrengthPanel from "../components/HedgingStrengthPanel";
import LoadingState from "../components/ui/LoadingState";
import ErrorState from "../components/ui/ErrorState";
import Card from "../components/ui/Card";
import type { ExposureResponse, ExpirationsResponse } from "../types";

const TICKER = "SPY";

export default function DealerPositioning() {
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
            <h1 className="text-2xl font-semibold text-white mb-2">Dealer Positioning</h1>
            <p className="text-sm text-text-secondary">
              Análisis de posicionamiento de dealers y presión de cobertura
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
        <LoadingState message="Analizando posicionamiento de dealers..." />
      )}

      {exposure && (
        <div className="flex flex-col gap-8">
          {/* Key Metrics - Solo Delta/Dealer positioning */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-info" />
                <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Net Delta</span>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                ${(exposure.net_delta_exposure / 1000000).toFixed(1)}M
              </div>
              <p className="text-sm text-text-secondary">
                {exposure.net_delta_exposure > 0 ? "Flujo comprador neto" : "Flujo vendedor neto"}
              </p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-success" />
                <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Call Wall</span>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                ${exposure.call_wall || 'N/A'}
              </div>
              <p className="text-sm text-text-secondary">Resistencia delta</p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-danger" />
                <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Put Wall</span>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                ${exposure.put_wall || 'N/A'}
              </div>
              <p className="text-sm text-text-secondary">Soporte delta</p>
            </Card>
          </div>

          {/* Delta Chart */}
          <Card variant="chart" className="h-[500px]">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-white mb-1">Delta Exposure Profile</h3>
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Exposición delta por strike</p>
            </div>
            <DeltaExposureChart 
              strikes={exposure.strikes} 
              spotPrice={exposure.spot_price} 
              netDeltaExposure={exposure.net_delta_exposure}
              callDexWall={exposure.call_wall}
              putDexWall={exposure.put_wall}
            />
          </Card>

          {/* Hedging Analysis */}
          <Card variant="narrative">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-white mb-1">Hedging Strength Analysis</h3>
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Capacidad de cobertura de dealers</p>
            </div>
            <HedgingStrengthPanel selectedExpiration={selectedExp} />
          </Card>
        </div>
      )}
    </div>
  );
}