import { useEffect, useState } from "react";
import { marketApi } from "../api/client";
import { Activity, AlertTriangle, TrendingUp, TrendingDown, Shield, Zap } from "lucide-react";
import YieldAnomalyPanel from "../components/YieldAnomalyPanel";
import LoadingState from "../components/ui/LoadingState";
import ErrorState from "../components/ui/ErrorState";
import Card from "../components/ui/Card";
import type { ExposureResponse, IntelligenceResponse, ExpirationsResponse } from "../types";

const TICKER = "SPY";

export default function Anomalies() {
  const [exposure, setExposure] = useState<ExposureResponse | null>(null);
  const [intelligence, setIntelligence] = useState<IntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = () => {
      setLoading(true);
      setError(null);
      const params = { ticker: TICKER, expiration: undefined };
      Promise.all([
        marketApi.getExposure(params),
        marketApi.getIntelligence(params),
      ])
        .then(([e, intel]) => {
          setExposure(e);
          setIntelligence(intel);
        })
        .catch((err) => setError(err?.message ?? "Error al consultar la API"))
        .finally(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getGammaAnomalies = () => {
    if (!exposure) return [];
    const anomalies = [];

    // Check for gamma flip
    if (exposure.zero_gamma) {
      const distance = Math.abs(exposure.spot_price - exposure.zero_gamma);
      const distancePct = (distance / exposure.spot_price) * 100;
      if (distancePct < 1) {
        anomalies.push({
          category: "Gamma Flip",
          severity: distancePct < 0.5 ? "Critical" : "High",
          score: Math.round(100 - distancePct * 50),
          description: `Zero Gamma a ${distancePct.toFixed(2)}% del precio actual`,
          impact: "Alta volatilidad esperada, posible cambio de régimen"
        });
      }
    }

    // Check for extreme gamma exposure
    const gexMagnitude = Math.abs(exposure.net_gamma_exposure) / 1000000;
    if (gexMagnitude > 500) {
      anomalies.push({
        category: "Gamma Extremo",
        severity: gexMagnitude > 1000 ? "Critical" : "High",
        score: Math.min(100, Math.round(gexMagnitude / 10)),
        description: `Net GEX de ${gexMagnitude.toFixed(1)}M`,
        impact: gexMagnitude > 0 ? "Fuerte estabilización de mercado" : "Alta desestabilización potencial"
      });
    }

    // Check for wall proximity
    if (exposure.call_wall) {
      const callDistance = Math.abs(exposure.spot_price - exposure.call_wall);
      const callDistancePct = (callDistance / exposure.spot_price) * 100;
      if (callDistancePct < 0.5) {
        anomalies.push({
          category: "Call Wall Proximity",
          severity: callDistancePct < 0.2 ? "High" : "Medium",
          score: Math.round(100 - callDistancePct * 100),
          description: `Call Wall a ${callDistancePct.toFixed(2)}% del spot`,
          impact: "Posible rechazo/pinning en este nivel"
        });
      }
    }

    if (exposure.put_wall) {
      const putDistance = Math.abs(exposure.spot_price - exposure.put_wall);
      const putDistancePct = (putDistance / exposure.spot_price) * 100;
      if (putDistancePct < 0.5) {
        anomalies.push({
          category: "Put Wall Proximity",
          severity: putDistancePct < 0.2 ? "High" : "Medium",
          score: Math.round(100 - putDistancePct * 100),
          description: `Put Wall a ${putDistancePct.toFixed(2)}% del spot`,
          impact: "Soporte fuerte esperado en este nivel"
        });
      }
    }

    return anomalies;
  };

  const getIntelligenceAnomalies = () => {
    if (!intelligence) return [];
    const anomalies = [];

    // Check for conflicting signals
    if (intelligence.confidence?.conflicting_factors?.length > 0) {
      anomalies.push({
        category: "Señales Conflicto",
        severity: "Medium",
        score: intelligence.confidence.conflicting_factors.length * 20,
        description: `${intelligence.confidence.conflicting_factors.length} factores en conflicto detectados`,
        impact: "Incertidumbre incrementada, menor confianza en predicciones"
      });
    }

    // Check for extreme risk scores
    if (intelligence.scores?.risk_score > 80) {
      anomalies.push({
        category: "Riesgo Extremo",
        severity: "Critical",
        score: intelligence.scores.risk_score,
        description: `Score de riesgo de ${intelligence.scores.risk_score.toFixed(0)}`,
        impact: "Condiciones de mercado peligrosas, precaución necesaria"
      });
    }

    // Check for regime changes
    const activeRegimes = intelligence.regimes?.filter(r => r.active) || [];
    if (activeRegimes.length > 1) {
      anomalies.push({
        category: "Transición de Régimen",
        severity: "High",
        score: 75,
        description: "Múltiples regímenes activos detectados",
        impact: "Periodo de transición, alta volatilidad esperada"
      });
    }

    return anomalies;
  };

  const getLiquidityAnomalies = () => {
    if (!exposure) return [];
    const anomalies = [];

    // Check for liquidity concentration
    if (exposure.high_liquidity_strikes.length > 0) {
      const nearSpotLiquidity = exposure.high_liquidity_strikes.filter(
        s => Math.abs(s - exposure.spot_price) < exposure.spot_price * 0.02
      );
      
      if (nearSpotLiquidity.length > 3) {
        anomalies.push({
          category: "Concentración de Liquidez",
          severity: "Medium",
          score: nearSpotLiquidity.length * 25,
          description: `${nearSpotLiquidity.length} zonas de alta liquidez cerca del spot`,
          impact: "Posible pinning, baja volatilidad esperada"
        });
      }
    }

    // Check for skew anomalies
    const skewRatio = exposure.put_call_oi_ratio;
    if (skewRatio > 2 || skewRatio < 0.5) {
      anomalies.push({
        category: "Skew Extremo",
        severity: "High",
        score: Math.round(Math.abs(skewRatio - 1) * 50),
        description: `Ratio P/C OI de ${skewRatio.toFixed(2)}`,
        impact: skewRatio > 1 ? "Sesgo bajista extremo" : "Sesgo alcista extremo"
      });
    }

    return anomalies;
  };

  if (loading && !exposure) {
    return <LoadingState message="Detectando anomalías de mercado..." />;
  }

  if (error) {
    return <ErrorState title="Error de conexión" message={error} />;
  }

  const gammaAnomalies = getGammaAnomalies();
  const intelligenceAnomalies = getIntelligenceAnomalies();
  const liquidityAnomalies = getLiquidityAnomalies();
  const allAnomalies = [...gammaAnomalies, ...intelligenceAnomalies, ...liquidityAnomalies];
  const criticalCount = allAnomalies.filter(a => a.severity === "Critical").length;
  const highCount = allAnomalies.filter(a => a.severity === "High").length;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 font-sans p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">Anomaly Detection</h1>
            <p className="text-sm text-text-secondary">
              Detección de anomalías en estructura de opciones, flujo y volatilidad
            </p>
          </div>
          <div className="flex items-center gap-4">
            {criticalCount > 0 && (
              <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 px-4 py-2 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-danger" />
                <span className="text-sm font-semibold text-danger">{criticalCount} Críticas</span>
              </div>
            )}
            {highCount > 0 && (
              <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 px-4 py-2 rounded-lg">
                <Zap className="w-5 h-5 text-warning" />
                <span className="text-sm font-semibold text-warning">{highCount} Altas</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Yield Anomaly Panel */}
      <div className="mb-8">
        <YieldAnomalyPanel />
      </div>

      {/* Anomaly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-info" />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Gamma Anomalías</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {gammaAnomalies.length}
          </div>
          <p className="text-sm text-text-secondary">
            {gammaAnomalies.filter(a => a.severity === "Critical").length} críticas
          </p>
        </Card>

        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-warning" />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Inteligencia</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {intelligenceAnomalies.length}
          </div>
          <p className="text-sm text-text-secondary">
            {intelligenceAnomalies.filter(a => a.severity === "Critical").length} críticas
          </p>
        </Card>

        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-success" />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Liquidez</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {liquidityAnomalies.length}
          </div>
          <p className="text-sm text-text-secondary">
            {liquidityAnomalies.filter(a => a.severity === "Critical").length} críticas
          </p>
        </Card>
      </div>

      {/* Detailed Anomalies */}
      {allAnomalies.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          <Card variant="narrative">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-white mb-1">Anomalías Detectadas</h3>
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Alertas prioritarias</p>
            </div>
            <div className="space-y-3">
              {allAnomalies.map((anomaly, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border ${
                    anomaly.severity === "Critical" 
                      ? "bg-danger/10 border-danger/30" 
                      : anomaly.severity === "High"
                      ? "bg-warning/10 border-warning/30"
                      : "bg-info/10 border-info/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      {anomaly.severity === "Critical" && <AlertTriangle className="w-4 h-4 text-danger" />}
                      {anomaly.severity === "High" && <Zap className="w-4 h-4 text-warning" />}
                      <span className="font-semibold text-white">{anomaly.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono px-2 py-1 rounded ${
                        anomaly.severity === "Critical" 
                          ? "bg-danger/20 text-danger" 
                          : anomaly.severity === "High"
                          ? "bg-warning/20 text-warning"
                          : "bg-info/20 text-info"
                      }`}>
                        {anomaly.severity}
                      </span>
                      <span className="text-xs font-mono text-text-secondary">
                        Score: {anomaly.score}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary mb-1">{anomaly.description}</p>
                  <p className="text-xs text-text-tertiary">{anomaly.impact}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <Card variant="narrative">
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Sin Anomalías Detectadas</h3>
            <p className="text-sm text-text-secondary">
              El mercado actual muestra condiciones normales sin anomalías significativas.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}