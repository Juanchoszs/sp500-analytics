import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import type { StrikeExposureOut } from "../types";
import Card from "./ui/Card";

interface Props {
  strikes: StrikeExposureOut[];
  spotPrice: number;
  putCallOiRatio: number;
  putCallVolumeRatio: number;
}

interface LiquidityRegime {
  type: "high" | "medium" | "low";
  label: string;
  description: string;
  color: string;
  icon: React.ReactNode;
}

interface LiquidityRisk {
  level: "low" | "medium" | "high";
  description: string;
  affectedStrikes: number[];
}

function computeLiquidityRegime(
  strikes: StrikeExposureOut[],
  putCallOiRatio: number,
): LiquidityRegime {
  const totalOi = strikes.reduce((sum, s) => sum + s.call_oi + s.put_oi, 0);
  const avgOiPerStrike = totalOi / (strikes.length || 1);
  const activeStrikes = strikes.filter(s => s.call_oi > 0 || s.put_oi > 0).length;
  const activeRatio = activeStrikes / (strikes.length || 1);

  // Combinar factores para determinar el régimen
  if (avgOiPerStrike > 50000 && activeRatio > 0.7) {
    return {
      type: "high",
      label: "Alta Liquidez",
      description: "El mercado muestra excelente profundidad de liquidez con amplia participación en múltiples strikes. Costos de transacción óptimos y bajo riesgo de slippage.",
      color: "text-success",
      icon: <CheckCircle className="w-5 h-5" />,
    };
  } else if (avgOiPerStrike > 20000 && activeRatio > 0.5) {
    return {
      type: "medium",
      label: "Liquidez Moderada",
      description: "Liquidez aceptable con participación razonable. Los costos de transacción son normales pero puede haber slippage en strikes menos activos.",
      color: "text-warning",
      icon: <Activity className="w-5 h-5" />,
    };
  } else {
    return {
      type: "low",
      label: "Baja Liquidez",
      description: "Liquidez limitada con poca participación. Mayor riesgo de slippage y costos de transacción elevados. Se recomienda precaución en ejecuciones grandes.",
      color: "text-danger",
      icon: <AlertTriangle className="w-5 h-5" />,
    };
  }
}

function computeLiquidityRisk(
  strikes: StrikeExposureOut[],
  spotPrice: number,
): LiquidityRisk {
  const windowStrikes = strikes.filter(s => Math.abs(s.strike - spotPrice) <= 20);
  const lowLiquidityStrikes = windowStrikes.filter(s => s.call_oi + s.put_oi < 10000);
  
  if (lowLiquidityStrikes.length === 0) {
    return {
      level: "low",
      description: "No se detectan riesgos significativos de liquidez en la vecindad del spot price.",
      affectedStrikes: [],
    };
  } else if (lowLiquidityStrikes.length <= windowStrikes.length * 0.3) {
    return {
      level: "medium",
      description: "Algunos strikes cercanos al spot presentan liquidez reducida. Considerar impacto potencial en ejecuciones.",
      affectedStrikes: lowLiquidityStrikes.map(s => s.strike),
    };
  } else {
    return {
      level: "high",
      description: "Múltiples strikes cercanos al spot tienen baja liquidez. Alto riesgo de slippage y costos elevados de transacción.",
      affectedStrikes: lowLiquidityStrikes.map(s => s.strike),
    };
  }
}

function getSentimentDescription(putCallOiRatio: number, putCallVolumeRatio: number): string {
  const oiSentiment = putCallOiRatio > 1 ? "sesgo bajista estructural" : "sesgo alcista estructural";
  const volumeSentiment = putCallVolumeRatio > 1 ? "flujo vendedor dominante" : "flujo comprador dominante";
  
  return `El mercado muestra ${oiSentiment} (P/C OI: ${putCallOiRatio.toFixed(2)}) con ${volumeSentiment} (P/C Vol: ${putCallVolumeRatio.toFixed(2)}).`;
}

export default function LiquidityRegimePanel({
  strikes,
  spotPrice,
  putCallOiRatio,
  putCallVolumeRatio,
}: Props) {
  const regime = computeLiquidityRegime(strikes, putCallOiRatio);
  const risk = computeLiquidityRisk(strikes, spotPrice);
  const sentiment = getSentimentDescription(putCallOiRatio, putCallVolumeRatio);

  const totalOi = strikes.reduce((sum, s) => sum + s.call_oi + s.put_oi, 0);
  const totalVolume = strikes.reduce((sum, s) => sum + s.call_volume + s.put_volume, 0);
  const liquidityRatio = totalOi > 0 ? (totalVolume / totalOi) * 100 : 0;

  return (
    <Card variant="narrative">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-white mb-1">Liquidity Regime Analysis</h3>
        <p className="text-xs text-text-tertiary uppercase tracking-wider">Evaluación del estado de liquidez del mercado</p>
      </div>

      <div className="space-y-6">
        {/* Regime Card */}
        <div className={`bg-secondary/30 border border-border rounded-lg p-4 ${regime.color}`}>
          <div className="flex items-center gap-3 mb-2">
            {regime.icon}
            <span className="font-semibold text-white">{regime.label}</span>
          </div>
          <p className="text-sm text-dim/70">{regime.description}</p>
        </div>

        {/* Sentiment Analysis */}
        <div className="bg-secondary/30 border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-accent" />
            <span className="font-semibold text-white text-sm">Sentimiento de Liquidez</span>
          </div>
          <p className="text-sm text-dim/70">{sentiment}</p>
        </div>

        {/* Risk Assessment */}
        <div className={`bg-secondary/30 border ${
          risk.level === "high" ? "border-destructive/40" : 
          risk.level === "medium" ? "border-warning/40" : 
          "border-border"
        } rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-2">
            {risk.level === "high" ? (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            ) : risk.level === "medium" ? (
              <Activity className="w-4 h-4 text-warning" />
            ) : (
              <CheckCircle className="w-4 h-4 text-success" />
            )}
            <span className="font-semibold text-white text-sm">
              Riesgo de Liquidez: {risk.level === "high" ? "Alto" : risk.level === "medium" ? "Moderado" : "Bajo"}
            </span>
          </div>
          <p className="text-sm text-dim/70 mb-3">{risk.description}</p>
          {risk.affectedStrikes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {risk.affectedStrikes.slice(0, 8).map((strike) => (
                <span key={strike} className="px-2 py-1 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive">
                  ${strike}
                </span>
              ))}
              {risk.affectedStrikes.length > 8 && (
                <span className="px-2 py-1 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive">
                  +{risk.affectedStrikes.length - 8} más
                </span>
              )}
            </div>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-secondary/30 border border-border rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wider text-dim/60 mb-1">Liquidity Ratio</div>
            <div className="text-lg font-bold text-white">{liquidityRatio.toFixed(1)}%</div>
            <div className="text-xs text-dim/70">Volume/OI</div>
          </div>
          <div className="bg-secondary/30 border border-border rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wider text-dim/60 mb-1">Actividad Relativa</div>
            <div className="text-lg font-bold text-white">
              {liquidityRatio > 20 ? "Alta" : liquidityRatio > 10 ? "Moderada" : "Baja"}
            </div>
            <div className="text-xs text-dim/70">Basado en ratio</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
