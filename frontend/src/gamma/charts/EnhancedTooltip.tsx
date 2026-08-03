/**
 * Enhanced tooltip component for gamma data
 * Displays comprehensive strike information including Call GEX, Put GEX, Net GEX, Volume, OI, Timestamp
 */

import type { StrikeGammaData } from '../types/gammaTypes';
import { GAMMA_COLORS } from '../config/colors';

interface Props {
  strike: StrikeGammaData;
  x: number;
  y: number;
  visible: boolean;
  onClose: () => void;
}

export default function EnhancedTooltip({ strike, x, y, visible, onClose }: Props) {
  if (!visible || !strike) return null;
  
  const formatCompact = (value: number): string => {
    if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(0);
  };
  
  return (
    <div
      className="fixed bg-primary border border-border p-4 rounded-lg shadow-xl font-mono text-xs min-w-[220px] max-w-[300px] z-50"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-dim/70 hover:text-foreground transition-colors"
      >
        ×
      </button>
      
      <div className="text-foreground font-bold mb-3 pb-2 border-b border-border pr-6">
        Strike ${strike.strike}
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-dim/70">Call GEX:</span>
          <span className="text-bullish">{formatCompact(strike.callGex)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-dim/70">Put GEX:</span>
          <span className="text-destructive">{formatCompact(strike.putGex)}</span>
        </div>
        
        <div className="flex justify-between font-semibold">
          <span className="text-dim/70">Net GEX:</span>
          <span className={strike.netGex >= 0 ? 'text-bullish' : 'text-destructive'}>
            {formatCompact(strike.netGex)}
          </span>
        </div>
        
        <div className="border-t border-border pt-2 mt-2">
          <div className="flex justify-between">
            <span className="text-dim/70">Call Gamma:</span>
            <span className="text-foreground">{strike.callGamma.toFixed(4)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-dim/70">Put Gamma:</span>
            <span className="text-foreground">{strike.putGamma.toFixed(4)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-dim/70">Net Gamma:</span>
            <span className={strike.netGamma >= 0 ? 'text-bullish' : 'text-destructive'}>
              {strike.netGamma.toFixed(4)}
            </span>
          </div>
        </div>
        
        <div className="border-t border-border pt-2 mt-2">
          <div className="flex justify-between">
            <span className="text-dim/70">OI Gamma:</span>
            <span className="text-foreground">{formatCompact(strike.openInterestGamma)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-dim/70">Volume Gamma:</span>
            <span className="text-foreground">{formatCompact(strike.volumeGamma)}</span>
          </div>
        </div>
        
        <div className="border-t border-border pt-2 mt-2">
          <div className="flex justify-between">
            <span className="text-dim/70">Timestamp:</span>
            <span className="text-foreground">
              {strike.timestamp.toLocaleTimeString()}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-dim/70">Date:</span>
            <span className="text-foreground">
              {strike.timestamp.toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
