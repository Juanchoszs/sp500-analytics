import { ColorType, createChart } from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { OptionQuoteOut } from "../types";

interface Props {
  calls: OptionQuoteOut[];
  puts: OptionQuoteOut[];
}

export default function IVSmileChart({ calls, puts }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#1e293b" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "#334155" }, horzLines: { color: "#334155" } },
      width: containerRef.current.clientWidth,
      height: 280,
      rightPriceScale: { borderColor: "#334155" },
      timeScale: { borderColor: "#334155", visible: false },
    });

    const callsSorted = [...calls].sort((a, b) => a.strike - b.strike).filter((c) => c.implied_volatility > 0);
    const putsSorted = [...puts].sort((a, b) => a.strike - b.strike).filter((p) => p.implied_volatility > 0);

    const callLine = chart.addLineSeries({ color: "#22c55e", lineWidth: 2 });
    callLine.setData(callsSorted.map((c, i) => ({ time: i as unknown as any, value: c.implied_volatility * 100 })));

    const putLine = chart.addLineSeries({ color: "#ef4444", lineWidth: 2 });
    putLine.setData(putsSorted.map((p, i) => ({ time: i as unknown as any, value: p.implied_volatility * 100 })));

    chart.timeScale().fitContent();
    const handleResize = () => containerRef.current && chart.applyOptions({ width: containerRef.current.clientWidth });
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [calls, puts]);

  return (
    <div>
      <div ref={containerRef} className="w-full" />
      <div className="flex gap-4 mt-2 text-[11px] font-mono text-dim/70">
        <span><span className="inline-block w-2 h-2 mr-1" style={{ background: "#22c55e" }} />IV Calls</span>
        <span><span className="inline-block w-2 h-2 mr-1" style={{ background: "#ef4444" }} />IV Puts</span>
        <span>Eje Y en % de volatilidad implícita anualizada</span>
      </div>
    </div>
  );
}
