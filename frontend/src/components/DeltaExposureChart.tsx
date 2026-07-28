import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
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
import { buildDexChartData, formatCompact, type DexChartPoint } from "./charts/chartUtils";

interface Props {
  strikes: StrikeExposureOut[];
  spotPrice: number;
  netDeltaExposure: number;
  callDexWall?: number | null;
  putDexWall?: number | null;
}

export default function DeltaExposureChart({
  strikes,
  spotPrice,
  netDeltaExposure,
  callDexWall,
  putDexWall,
}: Props) {
  const data = buildDexChartData(strikes, spotPrice);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: DexChartPoint }[] }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const actionLabel =
      d.dealerAction === "buy"
        ? "Presión compradora: los dealers deben comprar para cubrir"
        : d.dealerAction === "sell"
          ? "Presión vendedora: los dealers deben vender para cubrir"
          : "Equilibrio de cobertura";

    return (
      <div style={tooltipStyle} className="p-3 shadow-xl min-w-[240px]">
        <div className="text-foreground font-bold mb-2">Strike {d.strike}</div>
        <div className="space-y-1 text-dim/70">
          <div>
            Call Delta: <span className="text-bullish">${formatCompact(d.callDex)}</span>
          </div>
          <div>
            Put Delta: <span className="text-destructive">${formatCompact(d.putDex)}</span>
          </div>
          <div>
            Net Delta: <span className={d.netDex >= 0 ? "text-bullish" : "text-destructive"}>${formatCompact(d.netDex)}</span>
          </div>
          <div className="text-[10px] mt-2 pt-2 border-t border-border text-neutral">
            {actionLabel}
          </div>
        </div>
      </div>
    );
  };

  const spotStrike = spotPrice.toString();
  const buyZone = data.filter((d) => d.dealerAction === "buy");
  const sellZone = data.filter((d) => d.dealerAction === "sell");

  return (
    <ChartCard
      title="Delta Exposure Profile"
      subtitle="DEX por Strike — presión de cobertura y dominancia de delta"
      legend={
        <>
          <LegendDot label="Call Delta" color={CHART_COLORS.call} />
          <LegendDot label="Put Delta" color={CHART_COLORS.put} />
          <LegendDot label="Net Delta" color={CHART_COLORS.net} />
          <LegendDot label="Spot" color={CHART_COLORS.spot} dashed />
        </>
      }
      stats={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
          <Stat label="Net DEX" value={`$${formatCompact(netDeltaExposure)}`} />
          <Stat label="Call DEX Wall" value={callDexWall?.toString() ?? "—"} accent={CHART_COLORS.call} />
          <Stat label="Put DEX Wall" value={putDexWall?.toString() ?? "—"} accent={CHART_COLORS.put} />
          <Stat label="Cobertura" value={`${buyZone.length} buy / ${sellZone.length} sell`} />
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
              tickFormatter={formatCompact}
              tick={axisTickStyle}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: CHART_COLORS.cursor }} />

            {buyZone.length > 0 && (
              <ReferenceArea
                x1={buyZone[0].strike}
                x2={buyZone[buyZone.length - 1].strike}
                fill={CHART_COLORS.dealerBuy}
                fillOpacity={1}
                strokeOpacity={0}
              />
            )}
            {sellZone.length > 0 && (
              <ReferenceArea
                x1={sellZone[0].strike}
                x2={sellZone[sellZone.length - 1].strike}
                fill={CHART_COLORS.dealerSell}
                fillOpacity={1}
                strokeOpacity={0}
              />
            )}

            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
            <ReferenceLine
              x={spotStrike}
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
            {callDexWall && (
              <ReferenceLine
                x={callDexWall.toString()}
                stroke={CHART_COLORS.call}
                strokeDasharray="2 4"
                strokeOpacity={0.7}
              />
            )}
            {putDexWall && (
              <ReferenceLine
                x={putDexWall.toString()}
                stroke={CHART_COLORS.put}
                strokeDasharray="2 4"
                strokeOpacity={0.7}
              />
            )}

            <Bar dataKey="callDex" fill={CHART_COLORS.call} fillOpacity={0.82} radius={[2, 2, 0, 0]} name="Call Delta" />
            <Bar dataKey="putDex" fill={CHART_COLORS.put} fillOpacity={0.82} radius={[0, 0, 2, 2]} name="Put Delta" />
            <Line
              type="monotone"
              dataKey="netDex"
              stroke={CHART_COLORS.net}
              strokeWidth={2.2}
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.net }}
              name="Net Delta"
            />
            <Line
              type="monotone"
              dataKey="cumNetDex"
              stroke={CHART_COLORS.zeroGamma}
              strokeWidth={1.6}
              strokeDasharray="6 4"
              dot={false}
              name="Delta Acumulada"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] font-mono text-dim/60 mt-2">
        El perfil muestra la concentración de delta alrededor del spot y la dirección de cobertura implícita para los dealers.
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
