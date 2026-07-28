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
import type { StrikeExposureOut } from "../types";
import ChartCard, { LegendDot } from "./charts/ChartCard";
import {
  CHART_COLORS,
  CHART_FONTS,
  CHART_MARGINS,
  axisTickStyle,
  tooltipStyle,
} from "./charts/chartTheme";
import { buildVolumeChartData, formatContracts, type VolumeChartPoint } from "./charts/chartUtils";

interface Props {
  strikes: StrikeExposureOut[];
  spotPrice: number;
  putCallVolumeRatio: number;
}

export default function VolumeChart({ strikes, spotPrice, putCallVolumeRatio }: Props) {
  const data = buildVolumeChartData(strikes, spotPrice);
  const totalVolume = data.reduce((sum, d) => sum + d.totalVol, 0);
  const topStrike = data.reduce(
    (best, d) => (d.totalVol > best.totalVol ? d : best),
    data[0] ?? { strikeNum: 0, totalVol: 0, callVol: 0, putVol: 0 },
  );

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: VolumeChartPoint }[] }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const callPct = d.totalVol > 0 ? ((d.callVol / d.totalVol) * 100).toFixed(0) : "0";
    const putPct = d.totalVol > 0 ? ((d.putVol / d.totalVol) * 100).toFixed(0) : "0";

    return (
      <div style={tooltipStyle} className="p-3 shadow-xl min-w-[210px]">
        <div className="text-foreground font-bold mb-2">
          Strike {d.strike}
          {d.isHighActivity && <span className="ml-2 text-[10px] text-neutral font-normal">Alta actividad</span>}
        </div>
        <div className="space-y-1 text-dim/70">
          <div>
            Call Vol: <span className="text-bullish">{formatContracts(d.callVol)}</span> ({callPct}%)
          </div>
          <div>
            Put Vol: <span className="text-destructive">{formatContracts(d.putVol)}</span> ({putPct}%)
          </div>
          <div>
            Net Vol: <span className={d.netVol >= 0 ? "text-bullish" : "text-destructive"}>{d.netVol >= 0 ? "+" : ""}{formatContracts(d.netVol)}</span>
          </div>
          <div className="text-[10px] mt-1">Total: {formatContracts(d.totalVol)} contratos</div>
        </div>
      </div>
    );
  };

  return (
    <ChartCard
      title="Volume Profile"
      subtitle="Flujo intradía por Strike — calls versus puts"
      legend={
        <>
          <LegendDot label="Call Volume" color={CHART_COLORS.call} />
          <LegendDot label="Put Volume" color={CHART_COLORS.put} />
          <LegendDot label="Net Volume" color={CHART_COLORS.net} />
          <LegendDot label="Spot" color={CHART_COLORS.spot} dashed />
        </>
      }
      stats={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
          <Stat label="Volumen Total" value={formatContracts(totalVolume)} />
          <Stat label="Strike Más Activo" value={topStrike?.strikeNum?.toString() ?? "—"} accent={CHART_COLORS.net} />
          <Stat label="P/C Vol Ratio" value={putCallVolumeRatio.toFixed(2)} />
          <Stat
            label="Sesgo de Flujo"
            value={
              putCallVolumeRatio > 1.2
                ? "Put-heavy"
                : putCallVolumeRatio < 0.8
                  ? "Call-heavy"
                  : "Equilibrado"
            }
          />
        </div>
      }
    >
      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={CHART_MARGINS.default} barGap={0} barCategoryGap="15%">
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

            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
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

            <Bar dataKey="callVol" fill={CHART_COLORS.call} fillOpacity={0.82} radius={[2, 2, 0, 0]} name="Call Volume" />
            <Bar dataKey="putVol" fill={CHART_COLORS.put} fillOpacity={0.82} radius={[0, 0, 2, 2]} name="Put Volume" />
            <Line
              type="monotone"
              dataKey="netVol"
              stroke={CHART_COLORS.net}
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: VolumeChartPoint };
                if (!payload.isHighActivity) return <g key={`dot-${payload.strike}`} />;
                return (
                  <circle
                    key={`dot-${payload.strike}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={CHART_COLORS.zeroGamma}
                    stroke={CHART_COLORS.net}
                    strokeWidth={1.5}
                  />
                );
              }}
              activeDot={{ r: 5, fill: CHART_COLORS.net }}
              name="Net Volume"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] font-mono text-dim/60 mt-2">
        El perfil identifica los strikes donde el flujo intradía está más concentrado y dónde se observa mayor sesgo de calls o puts.
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
