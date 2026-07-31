import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Brush
} from 'recharts';
import type { StrikeExposureOut } from "../types";
import { formatCompact } from "./charts/chartUtils";
import { useState, useMemo, useCallback } from 'react';

interface Props {
  strikes: StrikeExposureOut[];
  spotPrice: number;
  callWall: number | null;
  putWall: number | null;
  zeroGamma: number | null;
}

export default function GammaProfileChart({ strikes, spotPrice, callWall, putWall, zeroGamma }: Props) {
  const [brushRange, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>({});
  
  const sorted = useMemo(() => [...strikes].sort((a, b) => a.strike - b.strike), [strikes]);
  
  // Dynamic strike range calculation centered around spot price
  const displayData = useMemo(() => {
    // If brush is active, use brush range
    if (brushRange.startIndex !== undefined && brushRange.endIndex !== undefined) {
      return sorted.slice(brushRange.startIndex, brushRange.endIndex + 1).map(s => ({
        strike: s.strike.toString(),
        gex: s.gamma_exposure,
        callOi: s.call_oi,
        putOi: s.put_oi,
        isCallWall: s.strike === callWall,
        isPutWall: s.strike === putWall,
        isZeroGamma: s.strike === zeroGamma,
      }));
    }
    
    // Otherwise, use intelligent window around spot
    const optimalWindow = Math.min(40, Math.max(20, Math.floor(sorted.length / 3)));
    const spotIdx = closestIndex(sorted, spotPrice);
    const startIndex = Math.max(0, spotIdx - Math.floor(optimalWindow / 2));
    const endIndex = Math.min(sorted.length - 1, spotIdx + Math.ceil(optimalWindow / 2));
    
    return sorted.slice(startIndex, endIndex + 1).map(s => ({
      strike: s.strike.toString(),
      gex: s.gamma_exposure,
      callOi: s.call_oi,
      putOi: s.put_oi,
      isCallWall: s.strike === callWall,
      isPutWall: s.strike === putWall,
      isZeroGamma: s.strike === zeroGamma,
    }));
  }, [sorted, spotPrice, callWall, putWall, zeroGamma, brushRange]);

  const handleBrushChange = useCallback((e: any) => {
    setBrushRange({ startIndex: e.startIndex, endIndex: e.endIndex });
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-primary border border-border p-3 rounded-lg shadow-xl font-mono text-xs min-w-[180px] max-w-[250px]">
          <div className="text-foreground font-bold mb-2 pb-2 border-b border-border">Strike ${label}</div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-dim/70">GEX:</span>
              <span className={data.gex >= 0 ? "text-bullish" : "text-destructive"}>${formatCompact(data.gex)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim/70">Call OI:</span>
              <span className="text-foreground">{formatCompact(data.callOi)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim/70">Put OI:</span>
              <span className="text-foreground">{formatCompact(data.putOi)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card relative overflow-hidden" role="region" aria-label="Gráfico de perfil de Gamma">
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-accent/5 rounded-full blur-3xl opacity-50" aria-hidden="true" />
      
      <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
        <div>
          <h3 className="font-bold text-lg text-foreground">Total Gamma Notional</h3>
          <p className="text-[10px] uppercase tracking-wider text-dim/70 font-mono mt-1">Gamma Exposure by Strike</p>
        </div>
        
        <div className="flex gap-3 flex-wrap">
          <LegendItem label="Positive Gamma" color="#22c55e" />
          <LegendItem label="Negative Gamma" color="#ef4444" />
          <LegendItem label="Call Wall" color="#22c55e" glow />
          <LegendItem label="Put Wall" color="#ef4444" glow />
          <LegendItem label="Zero Gamma" color="#f59e0b" glow />
        </div>
      </div>

      <div className="h-[320px] sm:h-[380px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={displayData}
            margin={{ top: 10, right: 30, left: 10, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.4)" vertical={false} />
            <XAxis 
              dataKey="strike" 
              tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'IBM Plex Mono' }} 
              axisLine={false}
              tickLine={false}
              minTickGap={35}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tickFormatter={formatCompact} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'IBM Plex Mono' }} 
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.08)', stroke: 'rgba(255, 255, 255, 0.2)', strokeWidth: 1 }} />
            
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
            <ReferenceLine x={spotPrice.toString()} stroke="#ffffff" strokeWidth={2} strokeDasharray="3 3" label={{ position: 'top', value: 'SPOT', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
            {callWall && <ReferenceLine x={callWall.toString()} stroke="#22c55e" strokeWidth={2} strokeDasharray="3 3" label={{ position: 'top', value: 'CALL WALL', fill: '#22c55e', fontSize: 10, fontWeight: 'bold' }} />}
            {putWall && <ReferenceLine x={putWall.toString()} stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" label={{ position: 'top', value: 'PUT WALL', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />}
            {zeroGamma && <ReferenceLine x={zeroGamma.toString()} stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 3" label={{ position: 'top', value: 'ZERO GAMMA', fill: '#f59e0b', fontSize: 10, fontWeight: 'bold' }} />}

            <Bar dataKey="gex" radius={[2, 2, 0, 0]}>
              {displayData.map((entry, index) => {
                let color = entry.gex >= 0 ? "rgba(34, 197, 94, 0.7)" : "rgba(239, 68, 68, 0.7)";
                
                // Enhanced visual hierarchy for key levels
                if (entry.isCallWall) {
                  color = "#22c55e";
                }
                if (entry.isPutWall) {
                  color = "#ef4444";
                }
                if (entry.isZeroGamma) {
                  color = "#f59e0b";
                }
                
                return <Cell key={`cell-${index}`} fill={color} style={{ filter: entry.isCallWall || entry.isPutWall ? 'brightness(1.2)' : 'none' }} />;
              })}
            </Bar>
            
            {/* Brush for interactive navigation */}
            <Brush 
              dataKey="strike" 
              height={30} 
              stroke="#334155" 
              fill="rgba(51, 65, 85, 0.3)"
              travellerWidth={20}
              gap={5}
              onChange={handleBrushChange}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendItem({ label, color, glow = false }: { label: string; color: string; glow?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-mono text-dim/70 whitespace-nowrap">
      <span 
        className="inline-block w-2 h-2 rounded-full flex-shrink-0" 
        style={{ background: color, boxShadow: glow ? `0 0 8px ${color}` : 'none' }} 
      />
      {label}
    </div>
  )
}



function closestIndex(sorted: StrikeExposureOut[], value: number): number {
  let best = 0, bestDiff = Infinity;
  sorted.forEach((s, i) => {
    const diff = Math.abs(s.strike - value);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  });
  return best;
}
