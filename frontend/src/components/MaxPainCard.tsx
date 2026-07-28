import type { MaxPainResponse } from "../types";

interface Props {
  maxPain: MaxPainResponse;
}

export default function MaxPainCard({ maxPain }: Props) {
  const dist = maxPain.distance_pct;
  const isClose = dist !== null && Math.abs(dist) < 0.5;

  return (
    <div className="card relative overflow-hidden">
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-neutral/10 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition-opacity duration-500" />
      
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-neutral animate-pulse" />
        <h3 className="font-mono text-xs uppercase tracking-wider text-dim/70">
          Max Pain Target
        </h3>
      </div>
      
      <div className="flex items-end gap-3 mb-4">
        <div className="text-4xl text-white font-semibold">
          {maxPain.max_pain_index !== undefined && maxPain.max_pain_index !== null
            ? maxPain.max_pain_index.toFixed(2)
            : (maxPain.max_pain !== null ? maxPain.max_pain.toFixed(2) : "—")}
        </div>
        {dist !== null && (
          <div className={`font-mono text-sm mb-1 px-2 py-0.5 rounded ${isClose ? 'bg-neutral/20 text-neutral border border-neutral/30' : 'text-dim/70 bg-secondary border border-border'}`}>
            {dist >= 0 ? "+" : ""}{dist.toFixed(2)}% spot
          </div>
        )}
      </div>
      {maxPain.max_pain_index !== undefined && maxPain.max_pain_index !== null && (
        <div className="text-xs text-slate-400 mb-3">SPY equivalent: {maxPain.max_pain !== null ? maxPain.max_pain.toFixed(2) : '—'}</div>
      )
      }

      <div className="bg-secondary/50 border border-border rounded p-3 text-xs text-dim/70 leading-relaxed">
        Strike donde expiraría el menor valor intrínseco agregado. En escenarios de <strong className="text-white font-normal">Pinning Risk</strong>, el precio gravita hacia este nivel magnético en 0DTE.
      </div>
    </div>
  );
}
