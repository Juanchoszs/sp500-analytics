/**
 * Right panel component for key gamma metrics
 * Displays Zero Gamma, Major Positive/Negative, Net GEX, Current Spot, Time, Volume, OI, Expiration, Historical Date
 */

import { useState, useEffect } from 'react';
import type { GammaSnapshot } from '../types/gammaTypes';
import { GAMMA_COLORS } from '../config/colors';

interface Props {
  currentSnapshot: GammaSnapshot | null;
  isReplaying: boolean;
  replayDate: Date | null;
  totalVolume?: number;
  totalOi?: number;
  currentExpiration: string;
}

export default function RightPanel({
  currentSnapshot,
  isReplaying,
  replayDate,
  totalVolume,
  totalOi,
  currentExpiration,
}: Props) {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  
  const formatCompact = (value: number): string => {
    if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(0);
  };
  
  return (
    <div className="w-64 bg-secondary/30 border-l border-border p-4 flex flex-col gap-4">
      <div className="border-b border-border pb-3">
        <h3 className="font-bold text-foreground text-sm mb-2">Key Levels</h3>
        
        <MetricRow
          label="Zero Gamma"
          value={currentSnapshot?.zeroGamma}
          color={GAMMA_COLORS.zeroGamma}
          format="price"
        />
        
        <MetricRow
          label="Major Positive"
          value={currentSnapshot?.majorPositiveGamma}
          color={GAMMA_COLORS.majorPositive}
          format="price"
        />
        
        <MetricRow
          label="Major Negative"
          value={currentSnapshot?.majorNegativeGamma}
          color={GAMMA_COLORS.majorNegative}
          format="price"
        />
      </div>
      
      <div className="border-b border-border pb-3">
        <h3 className="font-bold text-foreground text-sm mb-2">Gamma Metrics</h3>
        
        <MetricRow
          label="Net GEX"
          value={currentSnapshot?.totalNetGex}
          color={currentSnapshot?.totalNetGex && currentSnapshot.totalNetGex >= 0 ? GAMMA_COLORS.positive : GAMMA_COLORS.negative}
          format="compact"
        />
        
        <MetricRow
          label="Current Spot"
          value={currentSnapshot?.spotPrice}
          color={GAMMA_COLORS.spot}
          format="price"
        />
      </div>
      
      <div className="border-b border-border pb-3">
        <h3 className="font-bold text-foreground text-sm mb-2">Volume & OI</h3>
        
        <MetricRow
          label="Total Volume"
          value={totalVolume}
          color={GAMMA_COLORS.text}
          format="compact"
        />
        
        <MetricRow
          label="Total OI"
          value={totalOi}
          color={GAMMA_COLORS.text}
          format="compact"
        />
      </div>
      
      <div className="border-b border-border pb-3">
        <h3 className="font-bold text-foreground text-sm mb-2">Time Info</h3>
        
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-dim/70">Current Time:</span>
          <span className="text-foreground">
            {currentTime.toLocaleTimeString()}
          </span>
        </div>
        
        {isReplaying && replayDate && (
          <div className="flex justify-between items-center text-xs font-mono mt-1">
            <span className="text-dim/70">Replay Date:</span>
            <span className="text-accent">
              {replayDate.toLocaleString()}
            </span>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="font-bold text-foreground text-sm mb-2">Expiration</h3>
        
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-dim/70">Current:</span>
          <span className="text-foreground">
            {currentExpiration || 'Nearest'}
          </span>
        </div>
        
        {currentSnapshot?.indexPrice && (
          <div className="flex justify-between items-center text-xs font-mono mt-1">
            <span className="text-dim/70">Index Price:</span>
            <span className="text-foreground">
              ${currentSnapshot.indexPrice.toFixed(2)}
            </span>
          </div>
        )}
      </div>
      
      {isReplaying && (
        <div className="mt-auto pt-3 border-t border-border">
          <div className="text-xs font-mono text-accent text-center">
            ● REPLAY MODE
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricRowProps {
  label: string;
  value: number | null | undefined;
  color: string;
  format: 'price' | 'compact' | 'number';
}

function MetricRow({ label, value, color, format }: MetricRowProps) {
  const formatValue = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return 'N/A';
    
    switch (format) {
      case 'price':
        return `$${val.toFixed(2)}`;
      case 'compact':
        if (Math.abs(val) >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
        if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
        if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
        return val.toFixed(0);
      case 'number':
        return val.toFixed(0);
      default:
        return val.toString();
    }
  };
  
  return (
    <div className="flex justify-between items-center text-xs font-mono">
      <span className="text-dim/70">{label}:</span>
      <span className="text-foreground" style={{ color }}>
        {formatValue(value)}
      </span>
    </div>
  );
}
