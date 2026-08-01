import { ArrowUp, ArrowDown, Target } from "lucide-react";
import { calculateExpectedRange, formatVolatility } from "../utils/volatilityCalculations";

interface Props {
  spotPrice: number;
  expectedMovePct: number;
  lowerBound?: number;
  upperBound?: number;
  atmIv?: number;
}

export default function ExpectedMoveChart({ 
  spotPrice, 
  expectedMovePct, 
  lowerBound, 
  upperBound,
  atmIv 
}: Props) {
  // Si tenemos bounds explícitos, usarlos, si no calcularlos
  const range = lowerBound && upperBound 
    ? { lower: lowerBound, upper: upperBound, range: upperBound - lowerBound }
    : calculateExpectedRange(spotPrice, expectedMovePct);

  const moveInPoints = range.range / 2;
  const moveInPercent = (moveInPoints / spotPrice) * 100;
  
  // Calcular posición del spot dentro del rango (0-100%)
  const rangeWidth = range.upper - range.lower;
  const spotPosition = rangeWidth > 0 ? ((spotPrice - range.lower) / rangeWidth) * 100 : 50;

  const getMethodDescription = () => {
    if (atmIv) {
      const ivMove = (atmIv / Math.sqrt(252)) * 100; // Aproximación diaria a anual
      return `Basado en ATM IV: ${formatVolatility(atmIv)}`;
    }
    return `Basado en Expected Move: ${formatVolatility(expectedMovePct)}`;
  };

  return (
    <div className="bg-secondary/30 border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold text-white">Expected Move Range</h3>
        </div>
        <div className="text-xs font-mono text-dim/70">
          {getMethodDescription()}
        </div>
      </div>

      {/* Expected Move Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface/50 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <ArrowDown className="w-3 h-3 text-destructive" />
            <div className="text-[10px] uppercase tracking-wider text-dim/60">
              Lower Bound
            </div>
          </div>
          <div className="text-xl font-bold text-destructive">
            ${range.lower.toFixed(2)}
          </div>
          <div className="text-xs text-dim/70">
            -{moveInPercent.toFixed(1)}%
          </div>
        </div>

        <div className="bg-surface/50 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-dim/60 mb-1">
            Spot Price
          </div>
          <div className="text-xl font-bold text-white">
            ${spotPrice.toFixed(2)}
          </div>
          <div className="text-xs text-dim/70">
            Referencia
          </div>
        </div>

        <div className="bg-surface/50 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <ArrowUp className="w-3 h-3 text-success" />
            <div className="text-[10px] uppercase tracking-wider text-dim/60">
              Upper Bound
            </div>
          </div>
          <div className="text-xl font-bold text-success">
            ${range.upper.toFixed(2)}
          </div>
          <div className="text-xs text-dim/70">
            +{moveInPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Visual Range Bar */}
      <div className="mb-4">
        <div className="relative h-8 bg-surface rounded-lg overflow-hidden">
          {/* Range Background */}
          <div 
            className="absolute inset-y-0 bg-gradient-to-r from-destructive/20 via-surface to-success/20"
            style={{ 
              left: '0%', 
              right: '0%' 
            }}
          />
          
          {/* Lower Bound Marker */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-destructive"
            style={{ left: '0%' }}
          />
          
          {/* Upper Bound Marker */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-success"
            style={{ right: '0%' }}
          />
          
          {/* Spot Price Marker */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-accent shadow-lg shadow-accent/50"
            style={{ left: `${spotPosition}%` }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
              SPOT
            </div>
          </div>

          {/* Range Labels */}
          <div className="absolute bottom-1 left-2 text-[10px] text-destructive font-mono">
            ${range.lower.toFixed(0)}
          </div>
          <div className="absolute bottom-1 right-2 text-[10px] text-success font-mono">
            ${range.upper.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Additional Context */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-dim/70">Rango esperado:</span>
          <span className="text-white font-mono">
            ${range.lower.toFixed(2)} - ${range.upper.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-dim/70">Ancho del rango:</span>
          <span className="text-white font-mono">
            ${range.range.toFixed(2)} ({moveInPercent.toFixed(1)}%)
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-dim/70">Movimiento esperado:</span>
          <span className="text-white font-mono">
            ±${moveInPoints.toFixed(2)} ({moveInPercent.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Interpretation */}
      <div className="mt-4 p-3 bg-surface/30 rounded-lg border border-border/50">
        <div className="text-xs text-dim/70 leading-relaxed">
          El mercado espera que el precio se mantenga dentro de este rango con una desviación estándar. 
          {moveInPercent > 3 
            ? " Rango amplio indicando alta incertidumbre o eventos próximos." 
            : moveInPercent > 1.5 
            ? " Rango normal para las condiciones actuales." 
            : " Rango estrecho indicando baja volatilidad esperada."}
        </div>
      </div>
    </div>
  );
}
