import type { ExposureResponse } from '../types';

interface Props {
  exposure: ExposureResponse;
}

export default function MarketProfilePanel({ exposure }: Props) {
  // Compute some insights
  const isLongGamma = exposure.net_gamma_exposure > 0;
  const hasGammaSqueezeRisk = !isLongGamma && Math.abs(exposure.net_gamma_exposure) > 100000000;
  const hasVolExpansionRisk = !isLongGamma;
  
  // Find support/resistance: call/put walls and max pain
  const support = exposure.put_wall;
  const resistance = exposure.call_wall;
  const maxPain = exposure.max_pain;
  
  // Expected range from zero gamma
  const expectedRangeLow = exposure.zero_gamma ? Math.max(exposure.zero_gamma - (exposure.zero_gamma * 0.02), 0) : null;
  const expectedRangeHigh = exposure.zero_gamma ? exposure.zero_gamma + (exposure.zero_gamma * 0.02) : null;
  
  // High risk strike
  const highestGammaStrike = exposure.strikes.reduce((prev, curr) => {
    return (Math.abs(curr.gamma_exposure) > Math.abs(prev.gamma_exposure)) ? curr : prev;
  }, exposure.strikes[0]);

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-accent" />
        <h3 className="font-bold text-lg text-foreground">Market Profile</h3>
      </div>
      
      <div className="space-y-4 text-xs">
        <div className="p-3 bg-secondary/50 rounded border border-border">
          <div className="font-mono text-[10px] uppercase text-dim/70 mb-1">¿Qué está haciendo Gamma?</div>
          <div className="font-bold text-sm">
            {isLongGamma ? (
              <span className="text-bullish">Dealer Long Gamma</span>
            ) : (
              <span className="text-destructive">Dealer Short Gamma</span>
            )}
          </div>
          <div className="text-dim/70 mt-1 leading-relaxed">
            {isLongGamma 
              ? "Estabilidad del mercado esperada. Los dealers hedgerán comprimiendo la volatilidad."
              : "Mayor volatilidad esperada. Los dealers hedgerán amplificando los movimientos."}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-secondary/50 rounded border border-border">
            <div className="font-mono text-[10px] uppercase text-dim/70 mb-1">Soporte Institucional</div>
            <div className="text-lg font-bold">
              {support ? support.toFixed(2) : "N/A"}
            </div>
          </div>
          
          <div className="p-3 bg-secondary/50 rounded border border-border">
            <div className="font-mono text-[10px] uppercase text-dim/70 mb-1">Resistencia Institucional</div>
            <div className="text-lg font-bold">
              {resistance ? resistance.toFixed(2) : "N/A"}
            </div>
          </div>
        </div>
        
        <div className="p-3 bg-secondary/50 rounded border border-border">
          <div className="font-mono text-[10px] uppercase text-dim/70 mb-1">Rango Esperado</div>
          <div className="text-sm font-mono">
            {expectedRangeLow ? `${expectedRangeLow.toFixed(2)} - ${expectedRangeHigh?.toFixed(2)}` : "N/A"}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-secondary/50 rounded border border-border">
            <div className="font-mono text-[10px] uppercase text-dim/70 mb-1">Strike con Mayor Riesgo</div>
            <div className="text-lg font-bold">
              {highestGammaStrike.strike.toFixed(2)}
            </div>
          </div>
          
          <div className="p-3 bg-secondary/50 rounded border border-border">
            <div className="font-mono text-[10px] uppercase text-dim/70 mb-1">Max Pain</div>
            <div className="text-lg font-bold">
              {maxPain ? maxPain.toFixed(2) : "N/A"}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded border ${hasGammaSqueezeRisk ? "bg-destructive/10 border-destructive/30" : "bg-secondary/50 border-border"}`}>
            <div className="font-mono text-[10px] uppercase text-dim/70 mb-1">Riesgo de Gamma Squeeze</div>
            <div className="font-bold">
              {hasGammaSqueezeRisk ? (
                <span className="text-destructive">Alto</span>
              ) : (
                <span className="text-bullish">Bajo</span>
              )}
            </div>
          </div>
          
          <div className={`p-3 rounded border ${hasVolExpansionRisk ? "bg-destructive/10 border-destructive/30" : "bg-secondary/50 border-border"}`}>
            <div className="font-mono text-[10px] uppercase text-dim/70 mb-1">Expansión Volatilidad</div>
            <div className="font-bold">
              {hasVolExpansionRisk ? (
                <span className="text-destructive">Probable</span>
              ) : (
                <span className="text-bullish">Improbable</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
