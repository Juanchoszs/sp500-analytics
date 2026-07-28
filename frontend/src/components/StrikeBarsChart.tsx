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
} from 'recharts';
import type { StrikeExposureOut } from '../types';

interface Props {
  strikes: StrikeExposureOut[];
  spotPrice: number;
  callWall: number | null;
  putWall: number | null;
  zeroGamma: number | null;
  showOnlyPositive?: boolean;
  showOnlyNegative?: boolean;
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
    const colorClass = data.gamma_exposure >= 0 ? 'text-bullish' : 'text-destructive';
    return (
      <div className="bg-primary border border-border p-3 rounded shadow-md font-mono text-xs">
        <div className="text-foreground font-bold mb-1">Strike {label}</div>
        <div className="text-dim/70">
          Gamma: <span className={colorClass}>{formatCompact(data.gamma_exposure)}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function StrikeBarsChart({
  strikes, spotPrice, callWall, putWall, zeroGamma, showOnlyPositive, showOnlyNegative }: Props) {
  const sortedStrikes = [...strikes].sort((a, b) => a.strike - b.strike).reverse();
  const filteredStrikes = sortedStrikes.filter(s => {
    if (showOnlyPositive) return s.gamma_exposure > 0;
    if (showOnlyNegative) return s.gamma_exposure < 0;
    return true;
  });

  return (
    <div className="h-[600px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={filteredStrikes}
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(51,65,85,0.4)"
            horizontal
          />
          <XAxis type="number" hide />
          <YAxis
            dataKey="strike"
            type="category"
            tick={{
              fill: '#94a3b8',
              fontSize: 10,
              fontFamily: 'IBM Plex Mono',
            }}
            width={60}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
          />

          <ReferenceLine x={0} stroke="rgba(255, 255, 255, 0.2)" />
          
          {callWall && (
            <ReferenceLine
              y={callWall}
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="4 4"
              label={{
                position: 'top',
                value: 'CW',
                fill: '#fff',
                fontSize: 11,
              }}
            />
          )}
          {putWall && (
            <ReferenceLine
              y={putWall}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="4 4"
              label={{
                position: 'top',
                value: 'PW',
                fill: '#fff',
                fontSize: 11,
              }}
            />
          )}
          {zeroGamma && (
            <ReferenceLine
              y={zeroGamma}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 4"
              label={{
                position: 'top',
                value: 'ZG',
                fill: '#fff',
                fontSize: 11,
              }}
            />
          )}
          <ReferenceLine
            y={spotPrice}
            stroke="#ffffff"
            strokeWidth={2}
            label={{
              position: 'top',
              value: 'SPOT',
              fill: '#fff',
              fontSize: 11,
            }}
          />

          <Bar dataKey="gamma_exposure" radius={[0, 2, 2, 0]}>
            {filteredStrikes.map((entry, index) => {
              let color = entry.gamma_exposure >= 0 ? '#22c55e' : '#ef4444';
              if (entry.strike === callWall) color = '#22c55e';
              if (entry.strike === putWall) color = '#ef4444';
              if (entry.strike === zeroGamma) color = '#f59e0b';
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
