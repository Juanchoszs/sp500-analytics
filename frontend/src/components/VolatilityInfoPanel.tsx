import { Info, Zap, TrendingUp, Shield } from "lucide-react";

interface Props {
  description?: string;
}

export default function VolatilityInfoPanel({ description }: Props) {
  return (
    <div className="bg-secondary/30 border border-border rounded-lg p-6">
      <div className="flex items-start gap-3 mb-4">
        <Info className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">¿Qué es este módulo?</h3>
          <p className="text-sm text-dim/70 leading-relaxed">
            Analiza la volatilidad del mercado de opciones de SPY, proporcionando insights sobre el miedo/greedy del mercado, 
            expectativas de movimiento futuro, y el régimen actual de volatilidad. El VIX (CBOE Volatility Index) es el indicador 
            más seguido de volatilidad implícita del mercado, midiendo las expectativas de volatilidad a 30 días.
          </p>
        </div>
      </div>

      {/* Key Concepts */}
      <div className="space-y-3 mt-4">
        <div className="flex items-start gap-3 p-3 bg-surface/30 rounded-lg">
          <Zap className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-white mb-1">VIX Index</div>
            <div className="text-xs text-dim/70">
              El "Fear Gauge" del mercado. Mide la volatilidad implícita esperada a 30 días. 
              Valores altos indican miedo, valores bajos indican complacencia.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-surface/30 rounded-lg">
          <TrendingUp className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-white mb-1">Expected Move</div>
            <div className="text-xs text-dim/70">
              Rango de precios esperado basado en la volatilidad implícita. 
              Indica dónde espera el mercado que el precio esté dentro de una desviación estándar.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-surface/30 rounded-lg">
          <Shield className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-white mb-1">Volatility Regime</div>
            <div className="text-xs text-dim/70">
              Clasificación del ambiente de volatilidad (Low/Normal/Elevated/Extreme). 
              Cada régimen tiene implicaciones diferentes para estrategias de trading y gestión de riesgo.
            </div>
          </div>
        </div>
      </div>

      {/* Additional Context */}
      {description && (
        <div className="mt-4 p-3 bg-accent/10 border border-accent/30 rounded-lg">
          <div className="text-xs text-dim/70 leading-relaxed">
            <span className="text-accent font-semibold">Análisis actual:</span> {description}
          </div>
        </div>
      )}
    </div>
  );
}
