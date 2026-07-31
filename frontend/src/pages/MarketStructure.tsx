import { useEffect, useState } from "react";
import { marketApi } from "../api/client";
import { TrendingUp, TrendingDown, BarChart3, Layers, Target, Zap, Shield, Activity } from "lucide-react";
import LoadingState from "../components/ui/LoadingState";
import ErrorState from "../components/ui/ErrorState";
import Card from "../components/ui/Card";
import type { ExposureResponse, IntelligenceResponse, ExpirationsResponse } from "../types";

const TICKER = "SPY";

export default function MarketStructure() {
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

  const getMarketPhase = () => {
    if (!intelligence || !exposure) return { phase: "Unknown", description: "No hay datos suficientes", color: "text-text-tertiary" };
    
    const bullishScore = intelligence.scores?.bullish_score || 50;
    const bearishScore = intelligence.scores?.bearish_score || 50;
    const netGamma = exposure.net_gamma_exposure;
    const netDelta = exposure.net_delta_exposure;
    
    if (bullishScore > 60 && netGamma > 0 && netDelta > 0) {
      return { 
        phase: "Acumulación Alcista", 
        description: "Compradores fuertes, dealers long gamma, flujo positivo",
        color: "text-success" 
      };
    } else if (bearishScore > 60 && netGamma < 0 && netDelta < 0) {
      return { 
        phase: "Distribución Bajista", 
        description: "Vendedores dominantes, dealers short gamma, flujo negativo",
        color: "text-danger" 
      };
    } else if (netGamma > 0 && Math.abs(netDelta) < 10000000) {
      return { 
        phase: "Consolidación", 
        description: "Rango definido, estabilización de volatilidad",
        color: "text-warning" 
      };
    } else if (netGamma < 0 && Math.abs(bullishScore - bearishScore) < 10) {
      return { 
        phase: "Transición Volátil", 
        description: "Cambio de régimen, alta volatilidad esperada",
        color: "text-info" 
      };
    } else {
      return { 
        phase: "Neutral", 
        description: "Sin tendencia clara, esperar confirmación",
        color: "text-text-tertiary" 
      };
    }
  };

  const getTrendStructure = () => {
    if (!exposure) return { trend: "Unknown", strength: 0, levels: [] };
    
    const callWall = exposure.call_wall;
    const putWall = exposure.put_wall;
    const spot = exposure.spot_price;
    
    let trend = "Neutral";
    let strength = 0;
    const levels = [];
    
    if (callWall && putWall) {
      const range = callWall - putWall;
      const rangePct = (range / spot) * 100;
      
      if (spot > (callWall + putWall) / 2) {
        trend = "Alcista";
        strength = Math.min(100, ((spot - putWall) / range) * 100);
      } else {
        trend = "Bajista";
        strength = Math.min(100, ((callWall - spot) / range) * 100);
      }
      
      levels.push(
        { name: "Resistencia 1", value: callWall, type: "resistance" },
        { name: "Pivot", value: (callWall + putWall) / 2, type: "pivot" },
        { name: "Soporte 1", value: putWall, type: "support" }
      );
    }
    
    if (exposure.zero_gamma) {
      levels.push({ name: "Zero Gamma", value: exposure.zero_gamma, type: "inflection" });
    }
    
    return { trend, strength: Math.round(strength), levels };
  };

  const getLiquidityStructure = () => {
    if (!exposure) return { zones: [], concentration: "Low" };
    
    const zones = [];
    const strikes = exposure.strikes;
    
    // Find high liquidity zones
    const avgOI = strikes.reduce((sum, s) => sum + s.call_oi + s.put_oi, 0) / strikes.length;
    const highLiquidityStrikes = strikes.filter(s => (s.call_oi + s.put_oi) > avgOI * 2);
    
    highLiquidityStrikes.forEach(strike => {
      zones.push({
        level: strike.strike,
        totalOI: strike.call_oi + strike.put_oi,
        type: strike.call_oi > strike.put_oi ? "call" : "put"
      });
    });
    
    // Determine concentration
    const concentration = zones.length > 5 ? "High" : zones.length > 2 ? "Medium" : "Low";
    
    return { zones: zones.slice(0, 6), concentration };
  };

  const getVolatilityRegime = () => {
    if (!intelligence) return { regime: "Unknown", expectedMove: 0, vixLevel: 0 };
    
    const volAnalysis = intelligence.volatility_analysis;
    if (!volAnalysis) return { regime: "Unknown", expectedMove: 0, vixLevel: 0 };
    
    return {
      regime: volAnalysis.regime_type || "Unknown",
      expectedMove: volAnalysis.expected_move_used || 0,
      vixLevel: volAnalysis.vix_current || 0,
      description: volAnalysis.description || ""
    };
  };

  if (loading && !exposure) {
    return <LoadingState message="Analizando estructura del mercado..." />;
  }

  if (error) {
    return <ErrorState title="Error de conexión" message={error} />;
  }

  const marketPhase = getMarketPhase();
  const trendStructure = getTrendStructure();
  const liquidityStructure = getLiquidityStructure();
  const volatilityRegime = getVolatilityRegime();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 font-sans p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">Market Structure</h1>
            <p className="text-sm text-text-secondary">
              Análisis de estructura de mercado, fases y niveles clave
            </p>
          </div>
        </div>
      </div>

      {/* Market Phase Card */}
      <Card variant="narrative" className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-medium text-white">Fase del Mercado</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className={`text-2xl font-bold ${marketPhase.color} mb-2`}>
              {marketPhase.phase}
            </div>
            <p className="text-sm text-text-secondary">{marketPhase.description}</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-white mb-2">
              {trendStructure.trend}
            </div>
            <p className="text-sm text-text-secondary">
              Fuerza de tendencia: {trendStructure.strength}%
            </p>
          </div>
          <div>
            <div className="text-2xl font-bold text-white mb-2">
              {liquidityStructure.concentration}
            </div>
            <p className="text-sm text-text-secondary">
              Concentración de liquidez
            </p>
          </div>
        </div>
      </Card>

      {/* Key Structure Levels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-success" />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Call Wall</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            ${exposure?.call_wall || 'N/A'}
          </div>
          <p className="text-sm text-text-secondary">Resistencia principal</p>
        </Card>

        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-danger" />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Put Wall</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            ${exposure?.put_wall || 'N/A'}
          </div>
          <p className="text-sm text-text-secondary">Soporte principal</p>
        </Card>

        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-warning" />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Zero Gamma</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            ${exposure?.zero_gamma || 'N/A'}
          </div>
          <p className="text-sm text-text-secondary">Punto de inflexión</p>
        </Card>

        <Card variant="metric">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-info" />
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Spot Price</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            ${exposure?.spot_price?.toFixed(2) || 'N/A'}
          </div>
          <p className="text-sm text-text-secondary">Precio actual</p>
        </Card>
      </div>

      {/* Structure Levels */}
      <Card variant="narrative" className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-medium text-white">Niveles Estructurales</h3>
        </div>
        <div className="space-y-3">
          {trendStructure.levels.map((level, index) => (
            <div 
              key={index}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                level.type === "resistance" 
                  ? "bg-danger/10 border-danger/30" 
                  : level.type === "support"
                  ? "bg-success/10 border-success/30"
                  : "bg-warning/10 border-warning/30"
              }`}
            >
              <div className="flex items-center gap-3">
                {level.type === "resistance" && <TrendingDown className="w-4 h-4 text-danger" />}
                {level.type === "support" && <TrendingUp className="w-4 h-4 text-success" />}
                {level.type === "pivot" && <Activity className="w-4 h-4 text-warning" />}
                {level.type === "inflection" && <Zap className="w-4 h-4 text-info" />}
                <span className="font-medium text-white">{level.name}</span>
              </div>
              <div className="text-xl font-bold text-white font-mono">
                ${level.value?.toFixed(2) || 'N/A'}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Liquidity Zones */}
      <Card variant="narrative" className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-medium text-white">Zonas de Liquidez</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {liquidityStructure.zones.map((zone, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg border ${
                zone.type === "call" 
                  ? "bg-success/10 border-success/30" 
                  : "bg-danger/10 border-danger/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-text-secondary">${zone.level.toFixed(2)}</span>
                <span className={`text-xs font-semibold ${zone.type === "call" ? "text-success" : "text-danger"}`}>
                  {zone.type.toUpperCase()}
                </span>
              </div>
              <div className="text-lg font-bold text-white">
                {(zone.totalOI / 1000).toFixed(0)}K OI
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Volatility Regime */}
      <Card variant="narrative">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-medium text-white">Régimen de Volatilidad</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-text-secondary mb-1">Régimen</div>
            <div className="text-xl font-bold text-white">{volatilityRegime.regime}</div>
          </div>
          <div>
            <div className="text-sm text-text-secondary mb-1">Movimiento Esperado</div>
            <div className="text-xl font-bold text-white">{volatilityRegime.expectedMove.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-sm text-text-secondary mb-1">VIX Actual</div>
            <div className="text-xl font-bold text-white">{volatilityRegime.vixLevel.toFixed(2)}</div>
          </div>
        </div>
        {volatilityRegime.description && (
          <div className="mt-4 p-4 bg-surface/50 rounded-lg">
            <p className="text-sm text-text-secondary">{volatilityRegime.description}</p>
          </div>
        )}
      </Card>
    </div>
  );
}