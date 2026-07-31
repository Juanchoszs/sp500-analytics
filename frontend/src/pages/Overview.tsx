import { useEffect, useState } from "react";
import { marketApi } from "../api/client";
import { useMarketDataStream } from "../hooks/useMarketDataStream";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Shield, Activity, Target, Zap, BarChart3 } from "lucide-react";
import LoadingState from "../components/ui/LoadingState";
import ErrorState from "../components/ui/ErrorState";
import Card from "../components/ui/Card";
import type { ExposureResponse, IntelligenceResponse, ExpirationsResponse } from "../types";

const TICKER = "SPY";

export default function Overview() {
  const [exposure, setExposure] = useState<ExposureResponse | null>(null);
  const [intelligence, setIntelligence] = useState<IntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceInfo, setPriceInfo] = useState<any | null>(null);
  const { marketData } = useMarketDataStream(TICKER);

  useEffect(() => {
    const fetchPrice = () => {
      marketApi.getPrice({ ticker: TICKER }).then(setPriceInfo).catch(() => {});
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (marketData) {
      setPriceInfo({
        price: marketData.price,
        change: marketData.change,
        change_percent: marketData.change_percent,
        timestamp: marketData.timestamp,
      });
    }
  }, [marketData]);

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

  const getMarketBias = () => {
    if (!intelligence) return { label: "Neutral", color: "text-neutral", icon: Minus };
    const bullishScore = intelligence.scores?.bullish_score || 50;
    const bearishScore = intelligence.scores?.bearish_score || 50;
    
    if (bullishScore > bearishScore + 10) {
      return { label: "Bullish", color: "text-success", icon: TrendingUp };
    } else if (bearishScore > bullishScore + 10) {
      return { label: "Bearish", color: "text-danger", icon: TrendingDown };
    } else {
      return { label: "Neutral", color: "text-warning", icon: Minus };
    }
  };

  const getGammaRegime = () => {
    if (!exposure) return { label: "Unknown", color: "text-text-tertiary" };
    return {
      label: exposure.net_gamma_exposure > 0 ? "Long Gamma" : "Short Gamma",
      color: exposure.net_gamma_exposure > 0 ? "text-success" : "text-danger"
    };
  };

  const getVolatilityRegime = () => {
    if (!intelligence) return { label: "Unknown", color: "text-text-tertiary" };
    const volRegime = intelligence.volatility_analysis?.regime_type || "Unknown";
    const colorMap: Record<string, string> = {
      "Low": "text-success",
      "Normal": "text-warning",
      "Elevated": "text-danger",
      "Extreme": "text-danger"
    };
    return { label: volRegime, color: colorMap[volRegime] || "text-text-tertiary" };
  };

  const getRiskLevel = () => {
    if (!intelligence) return { label: "Medium", color: "text-warning" };
    const riskScore = intelligence.scores?.risk_score || 50;
    if (riskScore > 70) return { label: "High", color: "text-danger" };
    if (riskScore < 30) return { label: "Low", color: "text-success" };
    return { label: "Medium", color: "text-warning" };
  };

  const getMarketHealth = () => {
    if (!intelligence || !exposure) return { score: 50, status: "Neutral" };
    
    let healthScore = 50;
    
    // Gamma contribution
    if (exposure.net_gamma_exposure > 0) healthScore += 10;
    else healthScore -= 10;
    
    // Risk contribution
    const riskScore = intelligence.scores?.risk_score || 50;
    healthScore += (50 - riskScore) / 5;
    
    // Volatility contribution
    const volRegime = intelligence.volatility_analysis?.regime_type || "Normal";
    if (volRegime === "Low") healthScore += 10;
    else if (volRegime === "Extreme") healthScore -= 20;
    
    healthScore = Math.max(0, Math.min(100, healthScore));
    
    let status = "Neutral";
    if (healthScore > 70) status = "Healthy";
    else if (healthScore < 30) status = "Stressed";
    
    return { score: Math.round(healthScore), status };
  };

  if (loading && !exposure) {
    return <LoadingState message="Analizando mercado..." />;
  }

  if (error) {
    return <ErrorState title="Error de conexión" message={error} />;
  }

  const marketBias = getMarketBias();
  const BiasIcon = marketBias.icon;
  const gammaRegime = getGammaRegime();
  const volatilityRegime = getVolatilityRegime();
  const riskLevel = getRiskLevel();
  const marketHealth = getMarketHealth();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 font-sans p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">Market Overview</h1>
            <p className="text-sm text-text-secondary">
              Visión general del estado actual del mercado
            </p>
          </div>
          {priceInfo && (
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-white">
                {TICKER} ${Number(priceInfo.price).toFixed(2)}
              </div>
              <div className={`text-lg font-medium ${priceInfo.change_percent >= 0 ? 'text-success' : 'text-danger'}`}>
                {priceInfo.change_percent >= 0 ? '+' : ''}{priceInfo.change_percent?.toFixed(2)}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Market Health Score */}
      <Card variant="narrative" className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              marketHealth.status === "Healthy" ? "bg-success/20" : 
              marketHealth.status === "Stressed" ? "bg-danger/20" : "bg-warning/20"
            }`}>
              <Activity className={`w-8 h-8 ${
                marketHealth.status === "Healthy" ? "text-success" : 
                marketHealth.status === "Stressed" ? "text-danger" : "text-warning"
              }`} />
            </div>
            <div>
              <div className="text-sm text-text-secondary mb-1">Salud del Mercado</div>
              <div className={`text-2xl font-bold ${
                marketHealth.status === "Healthy" ? "text-success" : 
                marketHealth.status === "Stressed" ? "text-danger" : "text-warning"
              }`}>
                {marketHealth.status}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-white">{marketHealth.score}</div>
            <div className="text-sm text-text-secondary">/ 100</div>
          </div>
        </div>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <BiasIcon className={`w-5 h-5 ${marketBias.color}`} />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Sesgo Mercado</span>
          </div>
          <div className={`text-3xl font-bold ${marketBias.color} mb-2`}>
            {marketBias.label}
          </div>
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div 
              className={`h-full ${marketBias.color}`}
              style={{ width: `${intelligence?.scores?.bullish_score || 50}%` }}
            />
          </div>
        </Card>

        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-info" />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Régimen Gamma</span>
          </div>
          <div className={`text-3xl font-bold ${gammaRegime.color} mb-2`}>
            {gammaRegime.label}
          </div>
          <p className="text-sm text-text-secondary">
            ${(exposure?.net_gamma_exposure / 1000000).toFixed(1)}M net
          </p>
        </Card>

        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-info" />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Volatilidad</span>
          </div>
          <div className={`text-3xl font-bold ${volatilityRegime.color} mb-2`}>
            {volatilityRegime.label}
          </div>
          <p className="text-sm text-text-secondary">
            VIX: {intelligence?.volatility_analysis?.vix_current?.toFixed(2) || 'N/A'}
          </p>
        </Card>

        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-warning" />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Nivel Riesgo</span>
          </div>
          <div className={`text-3xl font-bold ${riskLevel.color} mb-2`}>
            {riskLevel.label}
          </div>
          <p className="text-sm text-text-secondary">
            Score: {intelligence?.scores?.risk_score?.toFixed(0) || 'N/A'}
          </p>
        </Card>
      </div>

      {/* Key Levels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-success" />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Call Wall</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            ${exposure?.call_wall || 'N/A'}
          </div>
          <p className="text-sm text-text-secondary">Resistencia principal</p>
        </Card>

        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-warning" />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Zero Gamma</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            ${exposure?.zero_gamma || 'N/A'}
          </div>
          <p className="text-sm text-text-secondary">Punto de inflexión</p>
        </Card>

        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-5 h-5 text-danger" />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Put Wall</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            ${exposure?.put_wall || 'N/A'}
          </div>
          <p className="text-sm text-text-secondary">Soporte principal</p>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-info" />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Net Delta</span>
          </div>
          <div className="text-2xl font-bold text-white mb-2">
            ${(exposure?.net_delta_exposure / 1000000).toFixed(1)}M
          </div>
          <p className="text-sm text-text-secondary">
            {exposure?.net_delta_exposure > 0 ? "Flujo comprador" : "Flujo vendedor"}
          </p>
        </Card>

        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-info" />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Put/Call OI</span>
          </div>
          <div className="text-2xl font-bold text-white mb-2">
            {exposure?.put_call_oi_ratio.toFixed(2) || 'N/A'}
          </div>
          <p className="text-sm text-text-secondary">Ratio sentimiento</p>
        </Card>

        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Alertas Activas</span>
          </div>
          <div className="text-2xl font-bold text-white mb-2">
            {intelligence?.gamma_analysis?.risks?.length || 0}
          </div>
          <p className="text-sm text-text-secondary">Riesgos detectados</p>
        </Card>

        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-info" />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Confianza</span>
          </div>
          <div className="text-2xl font-bold text-white mb-2">
            {intelligence?.confidence?.level || 'N/A'}
          </div>
          <p className="text-sm text-text-secondary">
            {intelligence?.confidence?.consistency_score?.toFixed(0) || 0}% consistencia
          </p>
        </Card>
      </div>

      {/* Mini Narrative */}
      {intelligence && (
        <Card variant="narrative">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-medium text-white">Resumen Rápido</h3>
          </div>
          <p className="text-text-secondary leading-relaxed">
            {intelligence.narrative?.substring(0, 300)}...
          </p>
        </Card>
      )}
    </div>
  );
}