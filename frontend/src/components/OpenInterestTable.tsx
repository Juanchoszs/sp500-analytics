import type { StrikeExposureOut } from "../types";

interface Props {
  strikes: StrikeExposureOut[];
}

export default function OpenInterestTable({ strikes }: Props) {
  // Solo tomar los 15 strikes más relevantes (mayor OI total)
  const sorted = [...strikes].sort((a, b) => (b.call_oi + b.put_oi) - (a.call_oi + a.put_oi)).slice(0, 15);
  // Ordenar por strike para mostrarlos secuencialmente
  sorted.sort((a, b) => b.strike - a.strike); // Mayor strike arriba, menor abajo

  const maxOi = Math.max(...sorted.map(s => Math.max(s.call_oi, s.put_oi)));

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm font-mono whitespace-nowrap">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-dim/70 border-b border-border/50">
            <th className="py-2 px-3 text-right">Put OI</th>
            <th className="py-2 px-3 text-center">Strike</th>
            <th className="py-2 px-3 text-left">Call OI</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s.strike} className="border-b border-border/20 hover:bg-secondary/50 transition-colors group">
              {/* Puts (Left side) */}
              <td className="py-1.5 px-3 relative w-[40%] text-right">
                <div 
                  className="absolute right-0 top-1 bottom-1 bg-destructive/20 border-r border-destructive rounded-l-sm"
                  style={{ width: `${(s.put_oi / maxOi) * 100}%` }}
                />
                <span className="relative z-10 text-dim/70 group-hover:text-foreground transition-colors">
                  {formatCompact(s.put_oi)}
                </span>
              </td>
              
              {/* Strike (Center) */}
              <td className="py-1.5 px-3 text-center bg-secondary/30 text-foreground font-bold w-[20%] text-[13px]">
                {s.strike}
              </td>
              
              {/* Calls (Right side) */}
              <td className="py-1.5 px-3 relative w-[40%] text-left">
                <div 
                  className="absolute left-0 top-1 bottom-1 bg-bullish/20 border-l border-bullish rounded-r-sm"
                  style={{ width: `${(s.call_oi / maxOi) * 100}%` }}
                />
                <span className="relative z-10 text-dim/70 group-hover:text-foreground transition-colors">
                  {formatCompact(s.call_oi)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return (value / 1_000).toFixed(1) + "K";
  return value.toFixed(0);
}
