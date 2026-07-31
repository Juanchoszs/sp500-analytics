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

interface Props {
  strikes: StrikeExposureOut[];
  spotPrice: number;
  callWall: number | null;
  putWall: number | null;
  zeroGamma: number | null;
}

function formatCompact(value: number): string {
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1000000000) return (value / 1000000000).toFixed(1) + 'B';
  if (abs >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (abs >= 1000) return (value / 1000).toFixed(1) + 'K';
  return value.toFixed(0);
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const gammaColor = data.gamma_exposure >= 0 ? 'text-bullish' : 'text-destructive';
    const deltaColor = data.delta_exposure >= 0 ? 'text-bullish' : 'text-destructive';
    
    return (
      <div className="bg-primary border border-border p-4 rounded-lg shadow-xl font-mono text-xs min-w-[200px]">
        <div className="text-foreground font-bold mb-3 pb-2 border-b border-border">Strike ${label}</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-dim/70">Gamma:</span>
            <span className={gammaColor}>{formatCompact(data.gamma_exposure)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim/70">Delta:</span>
            <span className={deltaColor}>{formatCompact(data.delta_exposure)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim/70">Call OI:</span>
            <span className="text-foreground">{formatCompact(data.call_oi)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim/70">Put OI:</span>
            <span className="text-foreground">{formatCompact(data.put_oi)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim/70">Call Vol:</span>
            <span className="text-foreground">{formatCompact(data.call_volume)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim/70">Put Vol:</span>
            <span className="text-foreground">{formatCompact(data.put_volume)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function StrikeBarsChart({
  strikes, spotPrice, callWall, putWall, zeroGamma }: Props) {
  const sortedStrikes = [...strikes].sort((a, b) => a.strike - b.strike).reverse();

  // Encontrar el índice del spot price para mostrar Strikes cercanos
  const spotIndex = sortedStrikes.findIndex(s => s.strike >= spotPrice);
  const startIndex = Math.max(0, spotIndex - 10);
  const endIndex = Math.min(sortedStrikes.length, spotIndex + 15);
  const displayStrikes = sortedStrikes.slice(startIndex, endIndex);

  const maxAbsGamma = Math.max(...displayStrikes.map(s => Math.abs(s.gamma_exposure)));
  const maxAbsDelta = Math.max(...displayStrikes.map(s => Math.abs(s.delta_exposure)));

  return (
    <div className="h-[600px] w-full">
      <div className="mb-4 flex items-center gap-4 text-xs font-mono">
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
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={displayStrikes}
          margin={{ top: 20, right: 60, left: 60, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(51,65,85,0.3)"
            horizontal
          />
          
          <XAxis 
            type="number" 
            domain={[-maxAbsGamma * 1.2, maxAbsGamma * 1.2]}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(51,65,85,0.4)' }}
            tickLine={false}
          />
          
          <YAxis
            dataKey="strike"
            type="category"
            tick={{
              fill: '#94a3b8',
              fontSize: 11,
              fontFamily: 'IBM Plex Mono',
            }}
            width={55}
            axisLine={{ stroke: 'rgba(51,65,85,0.4)' }}
            tickLine={false}
          />
          
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
          />
          
          <Legend 
            verticalAlign="top" 
            height={36}
            wrapperStyle={{ fontSize: '11px', fontFamily: 'IBM Plex Mono' }}
          />

          <ReferenceLine x={0} stroke="rgba(255, 255, 255, 0.3)" strokeWidth={1} />
          
          {/* Key Levels */}
          {callWall && callWall >= displayStrikes[0]?.strike && callWall <= displayStrikes[displayStrikes.length - 1]?.strike && (
            <ReferenceLine
              y={callWall}
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                position: 'right',
                value: 'CALL WALL',
                fill: '#22c55e',
                fontSize: 10,
                fontWeight: 'bold'
              }}
            />
          )}
          
          {putWall && putWall >= displayStrikes[0]?.strike && putWall <= displayStrikes[displayStrikes.length - 1]?.strike && (
            <ReferenceLine
              y={putWall}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                position: 'right',
                value: 'PUT WALL',
                fill: '#ef4444',
                fontSize: 10,
                fontWeight: 'bold'
              }}
            />
          )}
          
          {zeroGamma && zeroGamma >= displayStrikes[0]?.strike && zeroGamma <= displayStrikes[displayStrikes.length - 1]?.strike && (
            <ReferenceLine
              y={zeroGamma}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                position: 'right',
                value: 'ZERO GAMMA',
                fill: '#f59e0b',
                fontSize: 10,
                fontWeight: 'bold'
              }}
            />
          )}
          
          <ReferenceLine
            y={spotPrice}
            stroke="#ffffff"
            strokeWidth={3}
            label={{
              position: 'right',
              value: 'SPOT',
              fill: '#ffffff',
              fontSize: 11,
              fontWeight: 'bold'
            }}
          />

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
  );
}
