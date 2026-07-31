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
  Legend,
} from 'recharts';
import type { StrikeExposureOut } from '../types';
import { useMemo } from 'react';
import { formatCompact } from './charts/chartUtils';

interface Props {
  strikes: StrikeExposureOut[];
  spotPrice: number;
  callWall: number | null;
  putWall: number | null;
  zeroGamma: number | null;
  indexPrice?: number | null;
  indexTicker?: string | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const gammaColor = (data.gamma_exposure >= 0 && !isNaN(data.gamma_exposure)) ? 'text-bullish' : 'text-destructive';
    const deltaColor = (data.delta_exposure >= 0 && !isNaN(data.delta_exposure)) ? 'text-bullish' : 'text-destructive';
    
    return (
      <div className="bg-primary border border-border p-4 rounded-lg shadow-xl font-mono text-xs min-w-[200px] max-w-[300px]">
        <div className="text-foreground font-bold mb-3 pb-2 border-b border-border">Strike ${label}</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-dim/70">Gamma:</span>
            <span className={gammaColor}>{!isNaN(data.gamma_exposure) ? formatCompact(data.gamma_exposure) : 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim/70">Delta:</span>
            <span className={deltaColor}>{!isNaN(data.delta_exposure) ? formatCompact(data.delta_exposure) : 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim/70">Call OI:</span>
            <span className="text-foreground">{!isNaN(data.call_oi) ? formatCompact(data.call_oi) : 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim/70">Put OI:</span>
            <span className="text-foreground">{!isNaN(data.put_oi) ? formatCompact(data.put_oi) : 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim/70">Call Vol:</span>
            <span className="text-foreground">{!isNaN(data.call_volume) ? formatCompact(data.call_volume) : 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim/70">Put Vol:</span>
            <span className="text-foreground">{!isNaN(data.put_volume) ? formatCompact(data.put_volume) : 'N/A'}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function StrikeBarsChart({
  strikes, spotPrice, callWall, putWall, zeroGamma, indexPrice, indexTicker }: Props) {
  // Sort ascending for horizontal layout
  const sortedStrikes = useMemo(() => [...strikes].sort((a, b) => a.strike - b.strike), [strikes]);

  // Dynamic strike range calculation based on spot price and data density
  const displayStrikes = useMemo(() => {
    const optimalWindow = 20; // Reduce window for a closer zoom
    
    let spotIndex = 0;
    let minDiff = Infinity;
    sortedStrikes.forEach((s, i) => {
      const diff = Math.abs(s.strike - spotPrice);
      if (diff < minDiff) {
        minDiff = diff;
        spotIndex = i;
      }
    });

    const startIndex = Math.max(0, spotIndex - Math.floor(optimalWindow / 2));
    const endIndex = Math.min(sortedStrikes.length, spotIndex + Math.ceil(optimalWindow / 2));
    return sortedStrikes.slice(startIndex, endIndex);
  }, [sortedStrikes, spotPrice]);

  const maxAbsGamma = useMemo(() => Math.max(...displayStrikes.map(s => Math.abs(s.gamma_exposure)), 1), [displayStrikes]);
  const maxAbsDelta = useMemo(() => Math.max(...displayStrikes.map(s => Math.abs(s.delta_exposure)), 1), [displayStrikes]);


  return (
    <div className="h-[300px] sm:h-[350px] w-full flex flex-col" role="region" aria-label="Gráfico de barras de Gamma por strike">
      <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-mono flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-dim/70">Gamma Positivo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-dim/70">Gamma Negativo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-dim/70">Delta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-white" />
          <span className="text-dim/70">Spot Price</span>
        </div>
        {indexPrice && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-400" />
            <span className="text-dim/70">{indexTicker || 'Index'}</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-x-auto pb-2">
        <div className="min-w-[800px] h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayStrikes}
              margin={{ top: 50, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(51,65,85,0.3)"
                vertical={false}
              />
              
              <XAxis
                dataKey="strike"
                type="category"
                tick={{
                  fill: '#94a3b8',
                  fontSize: 10,
                  fontFamily: 'IBM Plex Mono',
                }}
                axisLine={{ stroke: 'rgba(51,65,85,0.4)' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              
              <YAxis 
                type="number" 
                domain={[-maxAbsGamma * 1.2, maxAbsGamma * 1.2]}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={formatCompact}
                axisLine={{ stroke: 'rgba(51,65,85,0.4)' }}
                tickLine={false}
                width={55}
              />
              
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(255, 255, 255, 0.08)', stroke: 'rgba(255, 255, 255, 0.2)', strokeWidth: 1 }}
              />
              
              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{ 
                  fontSize: '11px', 
                  fontFamily: 'IBM Plex Mono',
                  paddingTop: '8px'
                }}
                iconType="circle"
              />

              <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.3)" strokeWidth={1} />
              
              {/* Key Levels */}
              {callWall && callWall >= displayStrikes[0]?.strike && callWall <= displayStrikes[displayStrikes.length - 1]?.strike && (
                <ReferenceLine
                  x={callWall}
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  label={{
                    position: 'top',
                    value: 'CALL WALL',
                    fill: '#22c55e',
                    fontSize: 10,
                    fontWeight: 'bold'
                  }}
                />
              )}
              
              {putWall && putWall >= displayStrikes[0]?.strike && putWall <= displayStrikes[displayStrikes.length - 1]?.strike && (
                <ReferenceLine
                  x={putWall}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  label={{
                    position: 'top',
                    value: 'PUT WALL',
                    fill: '#ef4444',
                    fontSize: 10,
                    fontWeight: 'bold'
                  }}
                />
              )}
              
              {zeroGamma && zeroGamma >= displayStrikes[0]?.strike && zeroGamma <= displayStrikes[displayStrikes.length - 1]?.strike && (
                <ReferenceLine
                  x={zeroGamma}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  label={{
                    position: 'top',
                    value: 'ZERO GAMMA',
                    fill: '#f59e0b',
                    fontSize: 10,
                    fontWeight: 'bold'
                  }}
                />
              )}
              
              <ReferenceLine
                x={spotPrice}
                stroke="#ffffff"
                strokeWidth={3}
                label={{
                  position: 'top',
                  value: 'SPOT',
                  fill: '#ffffff',
                  fontSize: 11,
                  fontWeight: 'bold'
                }}
              />
              
              {indexPrice && (
                <ReferenceLine
                  x={indexPrice}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  label={{
                    position: 'top',
                    value: indexTicker || 'INDEX',
                    fill: '#3b82f6',
                    fontSize: 10,
                    fontWeight: 'bold'
                  }}
                />
              )}

              {/* Gamma Bars */}
              <Bar 
                dataKey="gamma_exposure" 
                name="Gamma Exposure"
                radius={[0, 4, 4, 0]}
              >
                {displayStrikes.map((entry, index) => {
                  let color = entry.gamma_exposure >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
                  
                  // Highlight key levels
                  if (entry.strike === callWall) color = '#22c55e';
                  if (entry.strike === putWall) color = '#ef4444';
                  if (entry.strike === zeroGamma) color = '#f59e0b';
                  if (entry.strike === spotPrice) color = '#ffffff';
                  
                  return <Cell key={`gamma-${index}`} fill={color} />;
                })}
              </Bar>

              {/* Delta Bars (thinner, overlay) */}
              <Bar 
                dataKey="delta_exposure" 
                name="Delta Exposure"
                radius={[0, 2, 2, 0]}
                barSize={4}
              >
                {displayStrikes.map((entry, index) => {
                  const color = entry.delta_exposure >= 0 ? 'rgba(59, 130, 246, 0.6)' : 'rgba(168, 85, 247, 0.6)';
                  return <Cell key={`delta-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
