import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  legend?: ReactNode;
  stats?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function ChartCard({ title, subtitle, legend, stats, children, className = "" }: Props) {
  return (
    <div className={`card relative overflow-hidden ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <h3 className="font-bold text-lg text-foreground">{title}</h3>
          </div>
          {subtitle && (
            <p className="text-[10px] uppercase tracking-wider text-dim/70 font-mono mt-1 ml-3.5">
              {subtitle}
            </p>
          )}
        </div>
        {legend && <div className="flex flex-wrap gap-3 items-center">{legend}</div>}
      </div>
      {stats && <div className="mb-3">{stats}</div>}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function LegendDot({ label, color, dashed = false }: { label: string; color: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-mono text-dim/70">
      <span
        className="inline-block w-2.5 h-2.5 rounded-sm"
        style={{
          background: dashed ? "transparent" : color,
          border: dashed ? `2px dashed ${color}` : "none",
        }}
      />
      {label}
    </div>
  );
}
