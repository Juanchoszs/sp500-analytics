import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import type { StrikeExposureOut } from "../types";
import { formatCompact, closestIndex } from "./charts/chartUtils";

interface Props {
  strikes: StrikeExposureOut[];
  spotPrice: number;
  callWall: number | null;
  putWall: number | null;
  zeroGamma: number | null;
}

export default function StrikeGammaChart({ strikes, spotPrice, callWall, putWall, zeroGamma }: Props) {
  const sorted = [...strikes].sort((a, b) => a.strike - b.strike);
  const spotIdx = closestIndex(sorted, spotPrice);
  
  // Dynamic window calculation based on data density
  const optimalWindow = Math.min(30, Math.max(20, Math.floor(sorted.length / 3)));
  
  // Show all strikes if less than optimal window, otherwise filter around spot
  let displayData;
  if (sorted.length <= optimalWindow) {
    displayData = sorted.map(s => ({
      strike: s.strike,
      gex: s.gamma_exposure,
      callOi: s.call_oi,
      putOi: s.put_oi,
    }));
  } else {
    // Show dynamic window around spot
    const startIndex = Math.max(0, spotIdx - Math.floor(optimalWindow / 2));
    const endIndex = Math.min(sorted.length - 1, spotIdx + Math.ceil(optimalWindow / 2));
    
    displayData = sorted.slice(startIndex, endIndex + 1).map(s => ({
      strike: s.strike,
      gex: s.gamma_exposure,
      callOi: s.call_oi,
      putOi: s.put_oi,
    }));
  }

  const maxAbsGex = Math.max(...displayData.map(d => Math.abs(d.gex)));
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-primary border border-border p-3 rounded shadow-md font-mono text-xs">
          <div className="text-foreground font-bold mb-1">Strike {label}</div>
          <div className="text-dim/70">GEX: <span className={data.gex >= 0 ? "text-bullish" : "text-destructive"}>${formatCompact(data.gex)}</span></div>
          <div className="text-dim/70 mt-1">Call OI: {formatCompact(data.callOi)}</div>
          <div className="text-dim/70">Put OI: {formatCompact(data.putOi)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={displayData}
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.4)" horizontal={true} vertical={false} />
          
          <XAxis 
            type="number" 
            domain={[-maxAbsGex * 1.1, maxAbsGex * 1.1]} 
            hide={true} 
          />
          
          <YAxis 
            dataKey="strike" 
            type="category" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
            width={40}
          />
          
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
          
          <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
          
          {/* Spot price marker overlay */}
          <ReferenceLine y={spotPrice} stroke="#ffffff" strokeDasharray="3 3" label={{ position: 'right', value: 'SPOT', fill: '#fff', fontSize: 10 }} />
          {callWall && <ReferenceLine y={callWall} stroke="#22c55e" strokeDasharray="3 3" />}
          {putWall && <ReferenceLine y={putWall} stroke="#ef4444" strokeDasharray="3 3" />}

          <Bar dataKey="gex" radius={[0, 2, 2, 0]}>
            {
              displayData.map((entry, index) => {
                let color = entry.gex >= 0 ? "rgba(34, 197, 94, 0.8)" : "rgba(239, 68, 68, 0.8)";
                
                // SpotGamma style markers
                if (entry.strike === callWall) color = "#22c55e";
                if (entry.strike === putWall) color = "#ef4444";
                if (entry.strike === zeroGamma) color = "#f59e0b";

                return <Cell key={`cell-${index}`} fill={color} />;
              })
            }
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
