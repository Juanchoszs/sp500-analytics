import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

interface Props {
  exposure: ExposureResponse;
  activeLayers: {
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
  const data = buildDexChartData(exposure.strikes || [], exposure.spot_price);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: DexChartPoint }[] }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={tooltipStyle} className="p-3 shadow-xl min-w-[220px]">
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
    <div className="w-full h-[520px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={CHART_MARGINS.default}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="strike"
            tick={axisTickStyle}
            axisLine={false}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            tickFormatter={formatCompact}
            tick={axisTickStyle}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: CHART_COLORS.cursor }} />

          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />

          {activeLayers.spot && (
            <ReferenceLine
              x={exposure.spot_price.toString()}
              stroke={CHART_COLORS.spot}
              strokeDasharray="4 4"
              label={{ value: "SPOT", position: "top", fill: CHART_COLORS.spot, fontSize: 10, fontFamily: CHART_FONTS.mono }}
            />
          )}

          {activeLayers.callWall && exposure.call_wall && (
            <ReferenceLine
              x={exposure.call_wall.toString()}
              stroke={CHART_COLORS.call}
              strokeDasharray="3 3"
              label={{ value: "Call Wall", position: "top", fill: CHART_COLORS.call, fontSize: 10 }}
            />
          )}

          {activeLayers.putWall && exposure.put_wall && (
            <ReferenceLine
              x={exposure.put_wall.toString()}
              stroke={CHART_COLORS.put}
              strokeDasharray="3 3"
              label={{ value: "Put Wall", position: "top", fill: CHART_COLORS.put, fontSize: 10 }}
            />
          )}

          {activeLayers.zeroGamma && exposure.zero_gamma && (
            <ReferenceLine
              x={exposure.zero_gamma.toString()}
              stroke={CHART_COLORS.zeroGamma}
              strokeDasharray="3 3"
              label={{ value: "Zero Gamma", position: "top", fill: CHART_COLORS.zeroGamma, fontSize: 10 }}
            />
          )}

          {activeLayers.heatmap && (
            <>
              <Bar dataKey="callDex" fill={CHART_COLORS.call} fillOpacity={0.8} radius={[2, 2, 0, 0]} name="Call Delta" />
              <Bar dataKey="putDex" fill={CHART_COLORS.put} fillOpacity={0.8} radius={[0, 0, 2, 2]} name="Put Delta" />
              <Line type="monotone" dataKey="netDex" stroke={CHART_COLORS.net} strokeWidth={2} dot={false} name="Net Delta" />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
