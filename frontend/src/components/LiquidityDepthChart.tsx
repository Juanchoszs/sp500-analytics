import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StrikeExposureOut } from "../types";
import ChartCard, { LegendDot } from "./charts/ChartCard";
import {
  CHART_COLORS,
  CHART_FONTS,
  CHART_MARGINS,
  axisTickStyle,
  tooltipStyle,
} from "./charts/chartTheme";
import {
  filterStrikesAroundSpot,
  formatContracts,
  closestIndex,
} from "./charts/chartUtils";

interface Props {
  strikes: StrikeExposureOut[];
  spotPrice: number;
}

interface DepthChartPoint {
  strike: string;
  strikeNum: number;
  callDepth: number;
  putDepth: number;
  totalDepth: number;
  depthRatio: number;
}

function buildDepthChartData(
  strikes: StrikeExposureOut[],
  spotPrice: number,
  window = 30,
): DepthChartPoint[] {
  const filtered = filterStrikesAroundSpot(strikes, spotPrice, window);
  const maxDepth = Math.max(...filtered.map((s) => s.call_oi + s.put_oi), 1);

  return filtered.map((s) => {
    const callDepth = s.call_oi;
    const putDepth = s.put_oi;
    const totalDepth = callDepth + putDepth;
    const depthRatio = totalDepth > 0 ? callDepth / totalDepth : 0.5;

    return {
      strike: s.strike.toString(),
      strikeNum: s.strike,
      callDepth,
      putDepth,
      totalDepth,
      depthRatio,
    };
  });
}

export default function LiquidityDepthChart({ strikes, spotPrice }: Props) {
  const data = buildDepthChartData(strikes, spotPrice);
  const totalDepth = data.reduce((sum, d) => sum + d.totalDepth, 0);
  const avgCallDepth = data.reduce((sum, d) => sum + d.callDepth, 0) / (data.length || 1);
  const avgPutDepth = data.reduce((sum, d) => sum + d.putDepth, 0) / (data.length || 1);
  const dominantSide = avgCallDepth > avgPutDepth ? "Calls" : "Puts";

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: DepthChartPoint }[] }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const callPct = d.totalDepth > 0 ? ((d.callDepth / d.totalDepth) * 100).toFixed(0) : "0";
    const putPct = d.totalDepth > 0 ? ((d.putDepth / d.totalDepth) * 100).toFixed(0) : "0";

    return (
      <div style={tooltipStyle} className="p-3 shadow-xl min-w-[200px]">
        <div className="text-foreground font-bold mb-2">Strike ${d.strike}</div>
        <div className="space-y-1 text-dim/70">
          <div>
            Call Depth: <span className="text-bullish">{formatContracts(d.callDepth)}</span> ({callPct}%)
          </div>
          <div>
            Put Depth: <span className="text-destructive">{formatContracts(d.putDepth)}</span> ({putPct}%)
          </div>
          <div>
            Total Depth: <span className="text-accent">{formatContracts(d.totalDepth)}</span>
          </div>
          <div className="text-[10px] mt-1">
            Sesgo: <span className={d.depthRatio > 0.5 ? "text-bullish" : "text-destructive"}>
              {d.depthRatio > 0.5 ? "Call" : "Put"} {(Math.abs(d.depthRatio - 0.5) * 200).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ChartCard
      title="Liquidity Depth"
      subtitle="Profundidad de liquidez por strike"
      legend={
        <>
          <LegendDot label="Call Depth" color={CHART_COLORS.call} />
          <LegendDot label="Put Depth" color={CHART_COLORS.put} />
          <LegendDot label="Spot" color={CHART_COLORS.spot} dashed />
        </>
      }
      stats={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
          <Stat label="Profundidad Total" value={formatContracts(totalDepth)} />
          <Stat label="Lado Dominante" value={dominantSide} accent={dominantSide === "Calls" ? CHART_COLORS.call : CHART_COLORS.put} />
          <Stat label="Avg Call Depth" value={formatContracts(avgCallDepth)} />
          <Stat label="Avg Put Depth" value={formatContracts(avgPutDepth)} />
        </div>
      }
    >
      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={CHART_MARGINS.default}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="strike"
              tick={axisTickStyle}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatContracts}
              tick={axisTickStyle}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: CHART_COLORS.cursor }} />

            <ReferenceLine
              x={spotPrice.toString()}
              stroke={CHART_COLORS.spot}
              strokeDasharray="4 4"
              label={{
                value: "SPOT",
                position: "top",
                fill: CHART_COLORS.spot,
                fontSize: 10,
                fontFamily: CHART_FONTS.mono,
              }}
            />

            <Area
              type="monotone"
              dataKey="callDepth"
              stackId="depth"
              stroke={CHART_COLORS.call}
              fill={CHART_COLORS.call}
              fillOpacity={0.6}
              name="Call Depth"
            />
            <Area
              type="monotone"
              dataKey="putDepth"
              stackId="depth"
              stroke={CHART_COLORS.put}
              fill={CHART_COLORS.put}
              fillOpacity={0.6}
              name="Put Depth"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] font-mono text-dim/60 mt-2">
        Profundidad de liquidez muestra la capacidad de ejecución en cada strike. Mayor profundidad = menor impacto en precios.
      </p>
    </ChartCard>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-secondary/50 border border-border rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-dim/60">{label}</div>
      <div className="font-semibold mt-0.5" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}
