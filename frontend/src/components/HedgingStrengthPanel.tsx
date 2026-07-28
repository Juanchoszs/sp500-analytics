import { useEffect, useState } from "react";
import { marketApi } from "../api/client";
import type { HedgingStrengthResponse } from "../types";
import { ShieldAlert, Zap } from "lucide-react";

interface Props {
  selectedExpiration?: string;
}

export default function HedgingStrengthPanel({ selectedExpiration }: Props) {
  const [data, setData] = useState<HedgingStrengthResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    marketApi
      .getHedgingStrength({ ticker: "SPY", expiration: selectedExpiration })
      .then(setData)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedExpiration]);

  if (loading && !data) {
    return (
      <div className="card animate-pulse p-6 flex flex-col gap-3">
        <div className="h-4 w-40 bg-slate-800 rounded" />
        <div className="h-12 w-full bg-slate-800 rounded" />
      </div>
    );
  }

  if (!data) return null;

  const getClassColor = (c: string) => {
    switch (c) {
      case "Very Strong":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "Strong":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "Neutral":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "Weak":
        return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/30";
    }
  };

  return (
    <div className="card relative overflow-hidden">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Delta Hedging Strength</h3>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Market Maker Hedging Urgency</p>
          </div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-semibold font-mono ${getClassColor(data.classification)}`}>
          {data.classification}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center mb-4">
        <div className="sm:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-900/60 rounded-xl border border-white/5">
          <span className="text-4xl font-extrabold text-white font-mono tracking-tight">{data.score}</span>
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-mono mt-1">Hedging Score / 100</span>
          <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-500 h-full transition-all duration-500"
              style={{ width: `${data.score}%` }}
            />
          </div>
        </div>

        <div className="sm:col-span-8 space-y-2">
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/30 p-3 rounded-lg border border-white/5">
            {data.description}
          </p>
        </div>
      </div>

      <div className="space-y-2.5 pt-2 border-t border-white/10">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono block">Factores Contribuyentes</span>
        {Object.entries(data.factors).map(([key, val]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-44 truncate capitalize font-mono">
              {key.replace(/_/g, " ").replace("factor", "")}
            </span>
            <div className="flex-1 bg-slate-900 h-2 rounded-full overflow-hidden border border-white/5">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${val}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-200 w-10 text-right">{val}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
