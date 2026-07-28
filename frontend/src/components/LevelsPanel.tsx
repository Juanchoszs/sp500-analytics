import type { ExposureResponse } from "../types";
import { formatCompact } from "./charts/chartUtils";

interface Props {
  exposure: ExposureResponse;
}

export default function LevelsPanel({ exposure }: Props) {
  const levels = [
    { label: "Call Wall", value: exposure.call_wall, color: "text-accent", bg: "bg-accent/10" },
    { label: "Put Wall", value: exposure.put_wall, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Gamma Wall", value: exposure.gamma_wall, color: "text-neutral", bg: "bg-neutral/10" },
    { label: "Zero Gamma", value: exposure.zero_gamma, color: "text-ring", bg: "bg-ring/10" },
  ];

  return (
    <div className="card relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
      
      <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
        <h3 className="font-bold text-lg text-foreground">Market Levels</h3>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-dim/70 font-mono">Spot Price</div>
          <div className="text-right">
            {exposure.index_price ? (
              <>
                <div className="text-xl font-mono text-white font-semibold">{Number(exposure.index_price).toFixed(2)}</div>
                <div className="text-xs text-slate-400">{exposure.ticker} {Number(exposure.spot_price).toFixed(2)} {exposure.index_ratio ? `(ratio ${Number(exposure.index_ratio).toFixed(2)})` : ''}</div>
              </>
            ) : (
              <div className="text-xl font-mono text-white font-semibold">{exposure.spot_price.toFixed(2)}</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {levels.map((lvl) => (
          <div key={lvl.label} className={`p-3 rounded-lg border border-border ${lvl.bg} backdrop-blur-sm`}>
            <div className="text-xs uppercase tracking-wider text-dim/70 font-mono mb-1">{lvl.label}</div>
            <div>
              <div className={`text-lg font-mono font-semibold ${lvl.color}`}>
                {lvl.value !== null ? lvl.value.toFixed(2) : "—"}
              </div>
              {exposure.call_wall_index !== undefined && exposure.call_wall_index !== null && lvl.label === 'Call Wall' && (
                <div className="text-xs text-slate-400 mt-1">{exposure.call_wall_index.toFixed(2)} (S&P 500)</div>
              )}
              {exposure.put_wall_index !== undefined && exposure.put_wall_index !== null && lvl.label === 'Put Wall' && (
                <div className="text-xs text-slate-400 mt-1">{exposure.put_wall_index.toFixed(2)} (S&P 500)</div>
              )}
              {exposure.zero_gamma_index !== undefined && exposure.zero_gamma_index !== null && lvl.label === 'Zero Gamma' && (
                <div className="text-xs text-slate-400 mt-1">{exposure.zero_gamma_index.toFixed(2)} (S&P 500)</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-3 border-t border-border">
        <MetricBox label="Net GEX" value={exposure.net_gamma_exposure} prefix="$" />
        <MetricBox label="Net DEX" value={exposure.net_delta_exposure} prefix="$" />
        <MetricBox label="Net Vega" value={exposure.net_vega_exposure} prefix="$" neutral />
        <MetricBox label="P/C OI" value={exposure.put_call_oi_ratio} neutral format="fixed2" />
      </div>
    </div>
  );
}

function MetricBox({ label, value, prefix = "", neutral = false, format = "compact" }: any) {
  const isPositive = value >= 0;
  const colorClass = neutral ? "text-white" : isPositive ? "text-bullish" : "text-destructive";
  
  const formattedValue = format === "compact" ? formatCompact(value) : value.toFixed(2);
  
  return (
    <div>
      <div className="text-xs font-mono text-dim/70 mb-0.5">{label}</div>
      <div className={`font-mono text-sm font-semibold ${colorClass}`}>
        {prefix}{formattedValue}
      </div>
    </div>
  );
}


