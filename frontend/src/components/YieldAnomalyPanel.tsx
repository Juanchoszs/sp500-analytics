import { useEffect, useState } from "react";
import { marketApi } from "../api/client";
import type { YieldAnomalyResponse } from "../types";
import { Activity, AlertTriangle, TrendingDown, TrendingUp, Minus } from "lucide-react";

export default function YieldAnomalyPanel() {
  const [data, setData] = useState<YieldAnomalyResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    marketApi
      .getYieldAnomaly()
      .then(setData)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading && !data) {
    return (
      <div className="card animate-pulse p-6 flex flex-col gap-3">
        <div className="h-4 w-40 bg-slate-800 rounded" />
        <div className="h-16 w-full bg-slate-800 rounded" />
      </div>
    );
  }

  if (!data) return null;

  const getDirectionBadge = (dir: string) => {
    switch (dir) {
      case "Bearish":
        return (
          <span className="flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-full font-mono">
            <TrendingDown className="h-3.5 w-3.5" /> Bearish
          </span>
        );
      case "Bullish":
        return (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full font-mono">
            <TrendingUp className="h-3.5 w-3.5" /> Bullish
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-300 bg-slate-500/10 border border-slate-500/30 px-2.5 py-1 rounded-full font-mono">
            <Minus className="h-3.5 w-3.5" /> Neutral
          </span>
        );
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "High":
      case "Critical":
        return "text-rose-400 bg-rose-500/10 border-rose-500/30";
      case "Medium":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      default:
        return "text-blue-400 bg-blue-500/10 border-blue-500/30";
    }
  };

  return (
    <div className="card relative overflow-hidden">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Yield Anomaly & Credit Stress</h3>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Rates, Spreads & Macro Dislocation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getDirectionBadge(data.expected_direction)}
          <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-white/10 px-2.5 py-1 rounded-full">
            Confianza: {data.confidence}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-4">
        <div className="sm:col-span-4 p-4 bg-slate-900/60 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{data.score}</span>
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-mono mt-1">Anomaly Score / 100</span>
        </div>
        <div className="sm:col-span-8 p-3.5 bg-slate-900/40 rounded-xl border border-white/5 flex flex-col justify-center">
          <p className="text-xs text-slate-300 leading-relaxed mb-2">{data.summary}</p>
          <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-400 pt-2 border-t border-white/5">
            <div>Curva 10Y-3M: <span className="text-white font-semibold">{data.curve_spread_2_10}%</span></div>
            <div>Crédito HYG/LQD: <span className="text-white font-semibold">{data.credit_spread_ratio}</span></div>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono block">Anomalías Detectadas</span>
        {data.anomalies.length === 0 ? (
          <div className="text-xs text-slate-500 font-mono p-3 bg-slate-900/30 rounded-lg">Sin anomalías críticas detectadas.</div>
        ) : (
          data.anomalies.map((item, idx) => (
            <div key={idx} className="p-3 bg-slate-900/40 rounded-lg border border-white/5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white font-mono">{item.category}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getSeverityBadge(item.severity)}`}>
                  {item.severity} ({item.score})
                </span>
              </div>
              <p className="text-xs text-slate-300">{item.description}</p>
              <p className="text-[11px] text-slate-400 font-mono">Impacto: {item.impact}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
