import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import type { StrikeExposureOut } from "../types";
import { formatCompact } from "./charts/chartUtils";

interface Props {
  strikes: StrikeExposureOut[];
  spotPrice: number;
  callWall: number | null;
  putWall: number | null;
  zeroGamma: number | null;
}

export default function GammaProfileChart({ strikes, spotPrice, callWall, putWall, zeroGamma }: Props) {
  const sorted = [...strikes].sort((a, b) => a.strike - b.strike);
  
  // Show all strikes if less than 60, otherwise filter around spot
  let displayData;
  if (sorted.length <= 60) {
    displayData = sorted.map(s => ({
      strike: s.strike.toString(),
      gex: s.gamma_exposure,
      callOi: s.call_oi,
      putOi: s.put_oi,
      isCallWall: s.strike === callWall,
      isPutWall: s.strike === putWall,
      isZeroGamma: s.strike === zeroGamma,
    }));
  } else {
    const spotIdx = closestIndex(sorted, spotPrice);
    const startIndex = Math.max(0, spotIdx - 30);
    const endIndex = Math.min(sorted.length - 1, spotIdx + 30);
    
    displayData = sorted.slice(startIndex, endIndex + 1).map(s => ({
      strike: s.strike.toString(),
      gex: s.gamma_exposure,
      callOi: s.call_oi,
      putOi: s.put_oi,
      isCallWall: s.strike === callWall,
      isPutWall: s.strike === putWall,
      isZeroGamma: s.strike === zeroGamma,
    }));
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-primary border border-border p-3 rounded shadow-md font-mono text-xs">
          <div className="text-foreground font-bold mb-1">Strike {label}</div>
          <div className="text-dim/70">GEX: <span className={data.gex >= 0 ? "text-bullish" : "text-destructive"}>${formatCompact(data.gex)}</span></div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-accent/5 rounded-full blur-3xl opacity-50" />
      
      <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
        <div>
          <h3 className="font-bold text-lg text-foreground">Total Gamma Notional</h3>
          <p className="text-[10px] uppercase tracking-wider text-dim/70 font-mono mt-1">Gamma Exposure by Strike</p>
        </div>
        
        <div className="flex gap-4">
          <LegendItem label="Positive Gamma" color="#22c55e" />
          <LegendItem label="Negative Gamma" color="#ef4444" />
          <LegendItem label="Call Wall" color="#22c55e" glow />
          <LegendItem label="Put Wall" color="#ef4444" glow />
          <LegendItem label="Zero Gamma" color="#f59e0b" glow />
        </div>
      </div>

      <div className="h-[320px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={displayData}
            margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.4)" vertical={false} />
            <XAxis 
              dataKey="strike" 
              tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'IBM Plex Mono' }} 
              axisLine={false}
              tickLine={false}
              minTickGap={20}
            />
            <YAxis 
              tickFormatter={formatCompact} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'IBM Plex Mono' }} 
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
            
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
            <ReferenceLine x={spotPrice.toString()} stroke="#ffffff" strokeDasharray="3 3" label={{ position: 'top', value: 'SPOT', fill: '#fff', fontSize: 10 }} />

            <Bar dataKey="gex" radius={[2, 2, 0, 0]}>
              {displayData.map((entry, index) => {
                let color = entry.gex >= 0 ? "rgba(34, 197, 94, 0.8)" : "rgba(239, 68, 68, 0.8)";
                if (entry.isCallWall) color = "#22c55e";
                if (entry.isPutWall) color = "#ef4444";
                if (entry.isZeroGamma) color = "#f59e0b";
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendItem({ label, color, glow = false }: { label: string; color: string; glow?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-mono text-dim/70 hidden sm:flex">
      <span 
        className="inline-block w-2.5 h-2.5 rounded-full" 
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
