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
import {
  buildOiChartData,
  computeOiQuality,
  formatContracts,
  type OiChartPoint,
} from "./charts/chartUtils";

interface Props {
  strikes: StrikeExposureOut[];
  spotPrice: number;
  putCallOiRatio: number;
}

export default function LiquidityProfileChart({ strikes, spotPrice, putCallOiRatio }: Props) {
  const data = buildOiChartData(strikes, spotPrice);
  const quality = computeOiQuality(strikes);
  const totalOi = data.reduce((sum, d) => sum + d.totalOi, 0);
  const topStrike = data.reduce(
    (best, d) => (d.totalOi > best.totalOi ? d : best),
    data[0] ?? { strikeNum: 0, totalOi: 0 },
  );

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: OiChartPoint }[] }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const callPct = d.totalOi > 0 ? ((d.callOi / d.totalOi) * 100).toFixed(0) : "0";
    const putPct = d.totalOi > 0 ? ((d.putOi / d.totalOi) * 100).toFixed(0) : "0";
    const liquidityScore = d.totalOi > 0 ? ((d.totalOi / totalOi) * 100).toFixed(1) : "0";

    return (
      <div style={tooltipStyle} className="p-3 shadow-xl min-w-[220px]">
        <div className="text-foreground font-bold mb-2">
          Strike ${d.strike}
          {d.isHighConcentration && (
            <span className="ml-2 text-[10px] text-accent font-normal">ALTA LIQUIDEZ</span>
          )}
        </div>
        <div className="space-y-1 text-dim/70">
          <div>
            Call OI: <span className="text-bullish">{formatContracts(d.callOi)}</span> ({callPct}%)
          </div>
          <div>
            Put OI: <span className="text-destructive">{formatContracts(d.putOi)}</span> ({putPct}%)
          </div>
          <div>
            Total Liquidity: <span className="text-accent">{formatContracts(d.totalOi)}</span>
          </div>
          <div className="text-[10px] mt-1">
            Score de Liquidez: <span className="text-accent font-semibold">{liquidityScore}%</span> del total
          </div>
        </div>
      </div>
    );
  };

  return (
    <ChartCard
      title="Liquidity Profile"
      subtitle="Distribución de liquidez por strike"
      legend={
        <>
          <LegendDot label="Call Liquidity" color={CHART_COLORS.call} />
          <LegendDot label="Put Liquidity" color={CHART_COLORS.put} />
          <LegendDot label="Total Liquidity" color={CHART_COLORS.net} />
          <LegendDot label="Spot" color={CHART_COLORS.spot} dashed />
        </>
      }
      stats={
        <div className="space-y-2">
          {!quality.isHealthy && (
            <div className="text-xs font-mono text-neutral bg-neutral/10 border border-neutral/30 rounded-lg px-3 py-2">
              Advertencia: {quality.zeroOiPct.toFixed(0)}% de strikes reportan OI=0 desde el proveedor.
              Los datos pueden estar incompletos o desactualizados (fuente: Yahoo Finance).
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
            <Stat label="Liquidez Total" value={formatContracts(totalOi)} />
            <Stat label="Strike Máximo" value={`$${topStrike?.strikeNum ?? "—"}`} accent={CHART_COLORS.net} />
            <Stat label="P/C OI Ratio" value={putCallOiRatio.toFixed(2)} />
            <Stat
              label="Calidad Datos"
              value={quality.isHealthy ? "OK" : "Parcial"}
              accent={quality.isHealthy ? CHART_COLORS.call : CHART_COLORS.zeroGamma}
            />
          </div>
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

            <Bar
              dataKey="callOi"
              fill={CHART_COLORS.call}
              fillOpacity={0.8}
              radius={[2, 2, 0, 0]}
              name="Call Liquidity"
            />
            <Bar
              dataKey="putOiNeg"
              fill={CHART_COLORS.put}
              fillOpacity={0.8}
              radius={[0, 0, 2, 2]}
              name="Put Liquidity"
            />
            <Line
              type="monotone"
              dataKey="totalOi"
              stroke={CHART_COLORS.net}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              name="Total Liquidity"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] font-mono text-dim/60 mt-2">
        Perfil de liquidez basado en open interest. Los strikes con mayor concentración representan niveles de mayor capacidad de ejecución.
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
