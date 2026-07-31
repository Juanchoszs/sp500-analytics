import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Brush,
} from "recharts";
import type { ExposureResponse } from "../types";
import {
  CHART_COLORS,
  CHART_FONTS,
  CHART_MARGINS,
  axisTickStyle,
  tooltipStyle,
} from "./charts/chartTheme";
import { buildDexChartData, formatCompact, type DexChartPoint } from "./charts/chartUtils";
import { useMemo } from 'react';

interface Props {
  exposure: ExposureResponse;
  activeLayers?: {
    heatmap: boolean;
    spot: boolean;
    candlestick: boolean;
    gammaFlip: boolean;
    putWall: boolean;
    callWall: boolean;
    highestGamma: boolean;
    zeroGamma: boolean;
  };
}

export default function MultiLayerHeatmap({ exposure, activeLayers }: Props) {
  const layers = activeLayers || {
    heatmap: true,
    spot: true,
    candlestick: true,
    gammaFlip: true,
    putWall: true,
    callWall: true,
    highestGamma: true,
    zeroGamma: true,
  };
  const data = useMemo(() => buildDexChartData(exposure.strikes || [], exposure.spot_price, 15), [exposure.strikes, exposure.spot_price]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: DexChartPoint }[] }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={tooltipStyle} className="p-3 shadow-xl min-w-[220px] max-w-[300px]">
        <div className="text-foreground font-bold mb-1">Strike {d.strike}</div>
        <div className="space-y-1 text-dim/70 text-xs">
          <div>Call Delta: <span className="text-bullish">${formatCompact(d.callDex)}</span></div>
          <div>Put Delta: <span className="text-destructive">${formatCompact(d.putDex)}</span></div>
          <div>Net Delta: <span className={d.netDex >= 0 ? "text-bullish" : "text-destructive"}>${formatCompact(d.netDex)}</span></div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-[320px] sm:h-[380px] flex flex-col" role="region" aria-label="Mapa de calor de Gamma">
      <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-mono flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-dim/70">Call Delta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-dim/70">Put Delta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-dim/70">Net Delta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-white" />
          <span className="text-dim/70">Spot Price</span>
        </div>
        {exposure.index_price && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-400" />
            <span className="text-dim/70">{exposure.index_ticker || 'Index'}</span>
          </div>
        )}
      </div>
      
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="strike"
              tick={{ ...axisTickStyle, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tickFormatter={formatCompact}
              tick={axisTickStyle}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: CHART_COLORS.cursor, stroke: 'rgba(255, 255, 255, 0.2)', strokeWidth: 1 }} />

            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
            
            {/* Highlight gamma flip zone around zero gamma */}
            {layers.zeroGamma && exposure.zero_gamma && (
              <ReferenceArea 
                x1={(exposure.zero_gamma - 10).toString()} 
                x2={(exposure.zero_gamma + 10).toString()} 
                fill="rgba(245, 158, 11, 0.05)" 
              />
            )}

            {layers.spot && (
              <ReferenceLine
                x={exposure.spot_price.toString()}
                stroke={CHART_COLORS.spot}
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{ value: "SPOT", position: "top", fill: CHART_COLORS.spot, fontSize: 11, fontWeight: 'bold', fontFamily: CHART_FONTS.mono }}
              />
            )}

            {exposure.index_price && layers.spot && (
              <ReferenceLine
                x={exposure.index_price.toString()}
                stroke="#60a5fa"
                strokeWidth={2}
                strokeDasharray="4 2"
                label={{ value: exposure.index_ticker || "INDEX", position: "top", fill: "#60a5fa", fontSize: 10, fontFamily: CHART_FONTS.mono }}
              />
            )}

            {layers.callWall && exposure.call_wall && (
              <ReferenceLine
                x={exposure.call_wall.toString()}
                stroke={CHART_COLORS.call}
                strokeWidth={2}
                strokeDasharray="6 3"
                label={{ value: "Call Wall", position: "top", fill: CHART_COLORS.call, fontSize: 11, fontWeight: 'bold' }}
              />
            )}

            {layers.putWall && exposure.put_wall && (
              <ReferenceLine
                x={exposure.put_wall.toString()}
                stroke={CHART_COLORS.put}
                strokeWidth={2}
                strokeDasharray="6 3"
                label={{ value: "Put Wall", position: "top", fill: CHART_COLORS.put, fontSize: 11, fontWeight: 'bold' }}
              />
            )}

            {layers.zeroGamma && exposure.zero_gamma && (
              <ReferenceLine
                x={exposure.zero_gamma.toString()}
                stroke={CHART_COLORS.zeroGamma}
                strokeWidth={2}
                strokeDasharray="6 3"
                label={{ value: "Zero Gamma", position: "top", fill: CHART_COLORS.zeroGamma, fontSize: 11, fontWeight: 'bold' }}
              />
            )}

            {layers.heatmap && (
              <>
                <Bar dataKey="callDex" fill={CHART_COLORS.call} fillOpacity={0.7} radius={[2, 2, 0, 0]} name="Call Delta" />
                <Bar dataKey="putDex" fill={CHART_COLORS.put} fillOpacity={0.7} radius={[0, 0, 2, 2]} name="Put Delta" />
                <Line type="monotone" dataKey="netDex" stroke={CHART_COLORS.net} strokeWidth={3} dot={false} name="Net Delta" />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
