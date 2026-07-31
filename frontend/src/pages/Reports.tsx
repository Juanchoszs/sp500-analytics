import { useState, useEffect } from "react";
import { marketApi } from "../api/client";
import { Download, FileText } from "lucide-react";
import { useReportDownload } from "../hooks/useReportDownload";
import IntelligenceReport from "../components/IntelligenceReport";
import LoadingState from "../components/ui/LoadingState";
import ErrorState from "../components/ui/ErrorState";
import Card from "../components/ui/Card";
import type { IntelligenceResponse, ExpirationsResponse } from "../types";

const TICKER = "SPY";

export default function Reports() {
  const [expirations, setExpirations] = useState<ExpirationsResponse | null>(null);
  const [selectedExp, setSelectedExp] = useState<string | undefined>(undefined);
  const [intelligence, setIntelligence] = useState<IntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDownloading, handleDownloadWord } = useReportDownload();

  useEffect(() => {
    marketApi.getExpirations({ ticker: TICKER }).then(setExpirations).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    const fetchIntelligence = () => {
      setLoading(true);
      setError(null);
      const params = { ticker: TICKER, expiration: selectedExp };
      marketApi.getIntelligence(params)
        .then(setIntelligence)
        .catch((err) => setError(err?.message ?? "Error al consultar la API"))
        .finally(() => setLoading(false));
    };

    fetchIntelligence();
    const interval = setInterval(fetchIntelligence, 30000);
    return () => clearInterval(interval);
  }, [selectedExp]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">Intelligence Reports</h1>
            <p className="text-sm text-text-secondary">
              Análisis narrativo completo del mercado
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleDownloadWord(TICKER, selectedExp)}
              disabled={isDownloading || !intelligence}
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

      {loading && !intelligence && (
        <LoadingState message="Generando inteligencia de mercado..." />
      )}

      {intelligence && (
        <div className="flex flex-col gap-8">
          {/* Main Intelligence Report - Sin gráficos, solo narrativa */}
          <Card variant="narrative">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-info" />
                <h3 className="text-lg font-medium text-white">Market Intelligence Report</h3>
              </div>
              <p className="text-xs text-text-tertiary uppercase tracking-wider">
                Análisis completo generado por IA
              </p>
            </div>
            <IntelligenceReport intelligence={intelligence} />
          </Card>

          {/* Scenario Analysis */}
          {intelligence.scenarios && (
            <Card variant="narrative">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-1">Scenario Analysis</h3>
                <p className="text-xs text-text-tertiary uppercase tracking-wider">Escenarios probables</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-surface-hover rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white">Principal</h4>
                    <span className="text-xs font-mono text-success">
                      {intelligence.scenarios.principal.probability_pct}%
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mb-3">
                    {intelligence.scenarios.principal.narrative}
                  </p>
                  <div className="text-xs text-text-tertiary">
                    <p className="font-medium mb-1">Condiciones de invalidación:</p>
                    <ul className="list-disc list-inside">
                      {intelligence.scenarios.principal.invalidation_conditions.map((cond, i) => (
                        <li key={i}>{cond}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-surface-hover rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white">Alternativo</h4>
                    <span className="text-xs font-mono text-warning">
                      {intelligence.scenarios.alternative.probability_pct}%
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mb-3">
                    {intelligence.scenarios.alternative.narrative}
                  </p>
                  <div className="text-xs text-text-tertiary">
                    <p className="font-medium mb-1">Condiciones de invalidación:</p>
                    <ul className="list-disc list-inside">
                      {intelligence.scenarios.alternative.invalidation_conditions.map((cond, i) => (
                        <li key={i}>{cond}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-surface-hover rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white">Riesgo</h4>
                    <span className="text-xs font-mono text-danger">
                      {intelligence.scenarios.risk.probability_pct}%
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mb-3">
                    {intelligence.scenarios.risk.narrative}
                  </p>
                  <div className="text-xs text-text-tertiary">
                    <p className="font-medium mb-1">Condiciones de invalidación:</p>
                    <ul className="list-disc list-inside">
                      {intelligence.scenarios.risk.invalidation_conditions.map((cond, i) => (
                        <li key={i}>{cond}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Regime Information */}
          {intelligence.regimes && intelligence.regimes.length > 0 && (
            <Card variant="narrative">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-1">Active Regimes</h3>
                <p className="text-xs text-text-tertiary uppercase tracking-wider">Régimenes detectados</p>
              </div>
              <div className="space-y-4">
                {intelligence.regimes.map((regime, index) => (
                  <div key={index} className="p-4 bg-surface-hover rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">{regime.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        regime.active ? 'bg-success/20 text-success' : 'bg-text-tertiary/20 text-text-tertiary'
                      }`}>
                        {regime.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mb-3">{regime.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-medium text-text-tertiary mb-1">Características:</p>
                        <ul className="list-disc list-inside text-text-secondary">
                          {regime.characteristics.map((char, i) => (
                            <li key={i}>{char}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-text-tertiary mb-1">Riesgos:</p>
                        <ul className="list-disc list-inside text-text-secondary">
                          {regime.risks.map((risk, i) => (
                            <li key={i}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}