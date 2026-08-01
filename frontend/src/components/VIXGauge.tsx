import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { calculateHistoricalPercentile, formatVIX } from "../utils/volatilityCalculations";

interface Props {
  vixCurrent: number;
  vixMin: number;
  vixMax: number;
  vixRank?: number;
}

export default function VIXGauge({ vixCurrent, vixMin, vixMax, vixRank }: Props) {
  const percentile = calculateHistoricalPercentile(vixCurrent, vixMin, vixMax);
  const gaugePercent = Math.max(0, Math.min(100, percentile));
  
  // Determinar color basado en nivel de VIX
  const getColor = () => {
    if (vixCurrent < 15) return "from-success to-emerald-600";
    if (vixCurrent < 25) return "from-warning to-amber-600";
    if (vixCurrent < 40) return "from-danger to-red-600";
    return "from-destructive to-red-700";
  };

  const getIcon = () => {
    if (vixCurrent < 15) return <TrendingDown className="w-5 h-5 text-success" />;
    if (vixCurrent < 25) return <Minus className="w-5 h-5 text-warning" />;
    return <TrendingUp className="w-5 h-5 text-danger" />;
  };

  const getInterpretation = () => {
    if (vixCurrent < 15) return "Baja - Complacencia en el mercado";
    if (vixCurrent < 25) return "Normal - Equilibrio de mercado";
    if (vixCurrent < 40) return "Elevada - Estrés o incertidumbre";
    return "Extrema - Pánico o crisis";
  };

  return (
    <div className="bg-secondary/30 border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getIcon()}
          <h3 className="text-lg font-semibold text-white">VIX Index</h3>
        </div>
        <div className="text-xs font-mono text-dim/70">
          CBOE Volatility Index
        </div>
      </div>

      {/* VIX Value Display */}
      <div className="mb-6">
        <div className="text-4xl font-bold text-white mb-1">
          {formatVIX(vixCurrent)}
        </div>
        <div className="text-sm text-dim/70">
          {getInterpretation()}
        </div>
      </div>

      {/* Gauge Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-dim/60 mb-2">
          <span>Min: {formatVIX(vixMin)}</span>
          <span>Percentil: {percentile.toFixed(0)}%</span>
          <span>Max: {formatVIX(vixMax)}</span>
        </div>
        <div className="h-3 bg-surface rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getColor()} transition-all duration-500`}
            style={{ width: `${gaugePercent}%` }}
          />
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-surface/50 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-dim/60 mb-1">
            Rank Histórico
          </div>
          <div className="text-lg font-semibold text-white">
            {vixRank !== undefined ? vixRank.toFixed(0) : "N/A"}
          </div>
        </div>
        <div className="bg-surface/50 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-dim/60 mb-1">
            Rango Histórico
          </div>
          <div className="text-lg font-semibold text-white">
            {formatVIX(vixMax - vixMin)}
          </div>
        </div>
      </div>

      {/* Interpretation Context */}
      <div className="mt-4 p-3 bg-surface/30 rounded-lg border border-border/50">
        <div className="text-xs text-dim/70 leading-relaxed">
          El VIX actual se encuentra en el percentil <span className="text-accent font-semibold">{percentile.toFixed(0)}%</span> de su rango histórico. 
          {percentile > 75 
            ? " Nivel alto de miedo/estrés en el mercado." 
            : percentile > 50 
            ? " Nivel moderado de volatilidad." 
            : " Nivel bajo de volatilidad, posible complacencia."}
        </div>
      </div>
    </div>
  );
}
