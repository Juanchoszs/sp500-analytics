import { CheckCircle, AlertTriangle, XCircle, Activity } from "lucide-react";
import { calculateVolatilityRegime } from "../utils/volatilityCalculations";

interface Props {
  vix: number;
  regimeType?: string;
}

export default function RegimeIndicator({ vix, regimeType }: Props) {
  const regime = calculateVolatilityRegime(vix);
  
  // Si se proporciona regimeType del API, usarlo para validación
  const displayRegime = regimeType ? {
    ...regime,
    type: regimeType as "Low" | "Normal" | "Elevated" | "Extreme",
    label: regimeType === "Low" ? "Baja Volatilidad" :
           regimeType === "Normal" ? "Volatilidad Normal" :
           regimeType === "Elevated" ? "Volatilidad Elevada" :
           "Volatilidad Extrema"
  } : regime;

  const getIcon = () => {
    switch (displayRegime.type) {
      case "Low":
        return <CheckCircle className="w-6 h-6 text-success" />;
      case "Normal":
        return <Activity className="w-6 h-6 text-warning" />;
      case "Elevated":
        return <AlertTriangle className="w-6 h-6 text-danger" />;
      case "Extreme":
        return <XCircle className="w-6 h-6 text-destructive" />;
      default:
        return <Activity className="w-6 h-6 text-dim" />;
    }
  };

  const getBgColor = () => {
    switch (displayRegime.type) {
      case "Low":
        return "bg-success/10 border-success/30";
      case "Normal":
        return "bg-warning/10 border-warning/30";
      case "Elevated":
        return "bg-danger/10 border-danger/30";
      case "Extreme":
        return "bg-destructive/10 border-destructive/30";
      default:
        return "bg-surface/10 border-border";
    }
  };

  const getTextColor = () => {
    switch (displayRegime.type) {
      case "Low":
        return "text-success";
      case "Normal":
        return "text-warning";
      case "Elevated":
        return "text-danger";
      case "Extreme":
        return "text-destructive";
      default:
        return "text-dim";
    }
  };

  const getRecommendation = () => {
    switch (displayRegime.type) {
      case "Low":
        return "Buen momento para estrategias risk-on, pero mantener alerta por posible complacencia.";
      case "Normal":
        return "Equilibrio entre riesgo y oportunidad. Estrategias direccionales funcionan bien.";
      case "Elevated":
        return "Precaución recomendada. Considerar estrategias defensivas y hedging.";
      case "Extreme":
        return "Alto riesgo/opunidad. Considerar estrategias contrarian y protección de capital.";
      default:
        return "Mantener monitoreo constante del régimen de volatilidad.";
    }
  };

  return (
    <div className={`border rounded-lg p-6 ${getBgColor()}`}>
      <div className="flex items-start gap-4">
        {/* Icon Section */}
        <div className="flex-shrink-0">
          {getIcon()}
        </div>

        {/* Content Section */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-white">Régimen de Volatilidad</h3>
            <span className={`text-sm font-bold ${getTextColor()}`}>
              VIX: {vix.toFixed(2)}
            </span>
          </div>

          <div className={`text-xl font-bold mb-2 ${getTextColor()}`}>
            {displayRegime.label}
          </div>

          <p className="text-sm text-dim/70 mb-4">
            {displayRegime.description}
          </p>

          {/* Recommendation Box */}
          <div className="bg-surface/50 rounded-lg p-3 border border-border/50">
            <div className="flex items-start gap-2">
              <Activity className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-white mb-1">
                  Recomendación
                </div>
                <div className="text-xs text-dim/70 leading-relaxed">
                  {getRecommendation()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic Light Visual */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <div className={`w-4 h-4 rounded-full ${displayRegime.type === 'Low' ? 'bg-success shadow-lg shadow-success/50' : 'bg-surface/30'}`} />
        <div className={`w-4 h-4 rounded-full ${displayRegime.type === 'Normal' ? 'bg-warning shadow-lg shadow-warning/50' : 'bg-surface/30'}`} />
        <div className={`w-4 h-4 rounded-full ${displayRegime.type === 'Elevated' ? 'bg-danger shadow-lg shadow-danger/50' : 'bg-surface/30'}`} />
        <div className={`w-4 h-4 rounded-full ${displayRegime.type === 'Extreme' ? 'bg-destructive shadow-lg shadow-destructive/50' : 'bg-surface/30'}`} />
      </div>

      {/* Regime Labels */}
      <div className="mt-2 flex justify-between text-[10px] text-dim/60 font-mono uppercase tracking-wider">
        <span>Low</span>
        <span>Normal</span>
        <span>Elevated</span>
        <span>Extreme</span>
      </div>
    </div>
  );
}
