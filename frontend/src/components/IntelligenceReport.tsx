import { useState } from "react";
import type { IntelligenceResponse } from "../types";

interface Props {
  intelligence: IntelligenceResponse;
}

export default function IntelligenceReport({ intelligence }: Props) {
  const [activeTab, setActiveTab] = useState<"narrative" | "scores" | "regimes" | "scenarios">("narrative");
  const [selectedScenario, setSelectedScenario] = useState<"principal" | "alternative" | "risk">("principal");

  const {
    scores,
    confidence,
    regimes,
    scenarios,
    narrative,
  } = intelligence;

  // Simple Markdown Parser
  const parseMarkdownToReact = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("# ")) {
        return (
          <h2 key={idx} className="text-xl font-bold text-foreground mt-4 mb-3 border-b border-border pb-2">
            {line.substring(2)}
          </h2>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={idx} className="text-lg font-semibold text-accent mt-4 mb-2">
            {line.substring(3)}
          </h3>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className="text-sm font-semibold font-mono text-dim/70 uppercase tracking-wider mt-3 mb-2">
            {line.substring(4)}
          </h4>
        );
      }
      if (line.startsWith("---")) {
        return <hr key={idx} className="border-border my-3" />;
      }
      if (line.startsWith("* ") || line.startsWith("- ")) {
        const content = parseInlineMarkdown(line.substring(2));
        return (
          <li key={idx} className="ml-5 list-disc text-sm text-dim/70 my-1.5 leading-relaxed">
            {content}
          </li>
        );
      }
      if (line.trim() === "") {
        return <div key={idx} className="h-2" />;
      }
      
      return (
        <p key={idx} className="text-sm leading-relaxed text-dim/70 my-2">
          {parseInlineMarkdown(line)}
        </p>
      );
    });
  };

  const parseInlineMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="text-foreground font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const getConfidenceBadgeColor = (level: string) => {
    if (level === "Alta") return "border-bullish/30 bg-bullish/10 text-bullish";
    if (level === "Media") return "border-neutral/30 bg-neutral/10 text-neutral";
    return "border-destructive/30 bg-destructive/10 text-destructive";
  };

  const getRegimeColor = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("positive") || n.includes("long")) return "border-bullish/30 bg-bullish/5 text-bullish";
    if (n.includes("negative") || n.includes("short") || n.includes("breakout")) return "border-destructive/30 bg-destructive/5 text-destructive";
    if (n.includes("volatility")) return "border-neutral/30 bg-neutral/5 text-neutral";
    return "border-border bg-secondary text-dim/70";
  };

  return (
    <div className="card flex flex-col gap-4 relative overflow-hidden">
      {/* Decorative glows */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-ring/5 rounded-full blur-3xl opacity-50 pointer-events-none" />

      {/* Encabezado Principal */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse"></span>
            <span className="font-mono text-xs text-accent uppercase tracking-wider font-semibold">
              Motor cuantitativo activo
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground mt-1">
            Análisis de Inteligencia de Mercado: S&P 500
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded border text-xs font-mono font-bold ${getConfidenceBadgeColor(confidence.level)}`}>
            CONFIANZA: {confidence.level.toUpperCase()} ({confidence.consistency_score}%)
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("narrative")}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all ${
            activeTab === "narrative" ? "border-accent text-foreground font-bold" : "border-transparent text-dim/70 hover:text-foreground"
          }`}
        >
          Informe Narrativo
        </button>
        <button
          onClick={() => setActiveTab("scores")}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all ${
            activeTab === "scores" ? "border-accent text-foreground font-bold" : "border-transparent text-dim/70 hover:text-foreground"
          }`}
        >
          Scores Cuantitativos
        </button>
        <button
          onClick={() => setActiveTab("scenarios")}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all ${
            activeTab === "scenarios" ? "border-accent text-foreground font-bold" : "border-transparent text-dim/70 hover:text-foreground"
          }`}
        >
          Escenarios del Día
        </button>
        <button
          onClick={() => setActiveTab("regimes")}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all ${
            activeTab === "regimes" ? "border-accent text-foreground font-bold" : "border-transparent text-dim/70 hover:text-foreground"
          }`}
        >
          Regímenes ({regimes.filter(r => r.active).length} Activos)
        </button>
      </div>

      {/* Contenido de los Tabs */}
      <div className="min-h-[300px]">
        {activeTab === "narrative" && (
          <div className="prose prose-invert max-w-none text-dim/70 select-text bg-secondary/30 p-4 border border-border/50 rounded-lg overflow-y-auto max-h-[600px]">
            {parseMarkdownToReact(narrative)}
          </div>
        )}

        {activeTab === "scores" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Bullish & Bearish (Visual Combat) */}
            <div className="bg-secondary border border-border p-4 rounded-lg flex flex-col justify-between col-span-1 md:col-span-2 lg:col-span-2">
              <div className="font-mono text-xs uppercase tracking-wider text-dim/70 border-b border-border pb-2 mb-3">
                Direccionalidad: Bullish vs Bearish
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-bullish font-bold">BULLISH SCORE</span>
                    <span className="text-foreground font-bold">{scores.bullish_score}%</span>
                  </div>
                  <div className="h-2.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-bullish transition-all"
                      style={{ width: `${scores.bullish_score}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm font-mono text-dim/70 font-bold">vs</div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-destructive font-bold">BEARISH SCORE</span>
                    <span className="text-foreground font-bold">{scores.bearish_score}%</span>
                  </div>
                  <div className="h-2.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-destructive transition-all"
                      style={{ width: `${scores.bearish_score}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-dim/70 leading-relaxed mt-2 border-t border-border/40 pt-2">
                {scores.explanations.bullish_score}
              </p>
            </div>

            {/* Risk Card */}
            <div className="bg-secondary border border-border p-4 rounded-lg flex flex-col justify-between">
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-dim/70 border-b border-border pb-2 mb-3">
                  Riesgo Sistémico
                </div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-2xl font-bold font-mono" style={{ color: scores.risk_score > 50 ? "#EF4444" : "#22C55E" }}>
                    {scores.risk_score}%
                  </span>
                  <span className="text-[10px] font-mono uppercase text-dim/70">Risk Score</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${scores.risk_score}%`,
                      backgroundColor: scores.risk_score > 50 ? "#EF4444" : "#22C55E"
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-dim/70 leading-relaxed">
                {scores.explanations.risk_score}
              </p>
            </div>

            {/* Volatility Card */}
            <div className="bg-secondary border border-border p-4 rounded-lg flex flex-col justify-between">
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-dim/70 border-b border-border pb-2 mb-3">
                  Volatilidad Teórica
                </div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-2xl font-bold font-mono text-neutral">{scores.volatility_score}%</span>
                  <span className="text-[10px] font-mono uppercase text-dim/70">Vol Score</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-neutral" style={{ width: `${scores.volatility_score}%` }} />
                </div>
              </div>
              <p className="text-xs text-dim/70 leading-relaxed">
                {scores.explanations.volatility_score}
              </p>
            </div>

            {/* Support Card */}
            <div className="bg-secondary border border-border p-4 rounded-lg flex flex-col justify-between">
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-dim/70 border-b border-border pb-2 mb-3">
                  Soporte del Dealer (Cushion)
                </div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-2xl font-bold font-mono text-bullish">{scores.dealer_support_score}%</span>
                  <span className="text-[10px] font-mono uppercase text-dim/70">Dealer Support</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-bullish" style={{ width: `${scores.dealer_support_score}%` }} />
                </div>
              </div>
              <p className="text-xs text-dim/70 leading-relaxed">
                {scores.explanations.dealer_support_score}
              </p>
            </div>

            {/* Gamma / Trend Strength */}
            <div className="bg-secondary border border-border p-4 rounded-lg flex flex-col justify-between">
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-dim/70 border-b border-border pb-2 mb-3">
                  Alineación de Flujos
                </div>
                <div className="flex flex-col gap-3 font-mono text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>GAMMA STRENGTH</span>
                      <span className="font-bold text-foreground">{scores.gamma_strength}%</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${scores.gamma_strength}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>TREND STRENGTH</span>
                      <span className="font-bold text-foreground">{scores.trend_strength}%</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${scores.trend_strength}%` }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-dim/70 leading-relaxed mt-3 border-t border-border/40 pt-2">
                Fuerza direccional de las opciones: Gamma mide unilinealidad de muros; Trend mide direccionalidad de coberturas delta agregadas.
              </div>
            </div>
          </div>
        )}

        {activeTab === "scenarios" && (
          <div className="flex flex-col md:flex-row gap-5">
            {/* Selector de escenario */}
            <div className="flex flex-row md:flex-col gap-2 w-full md:w-[220px]">
              {(["principal", "alternative", "risk"] as const).map((scKey) => {
                const s = scenarios[scKey];
                const active = selectedScenario === scKey;
                let colorClass = "border-accent/20 text-dim/70";
                if (active) {
                  if (scKey === "principal") colorClass = "border-accent bg-accent/10 text-accent font-bold";
                  if (scKey === "alternative") colorClass = "border-neutral bg-neutral/10 text-neutral font-bold";
                  if (scKey === "risk") colorClass = "border-destructive bg-destructive/10 text-destructive font-bold";
                }
                return (
                  <button
                    key={scKey}
                    onClick={() => setSelectedScenario(scKey)}
                    className={`flex-1 text-left px-3 py-2.5 rounded border text-xs font-mono transition-all ${colorClass}`}
                  >
                    <div className="text-[10px] uppercase text-dim/70 tracking-wider mb-1">
                      {scKey === "principal" ? "Principal" : scKey === "alternative" ? "Alternativo" : "Riesgo de Cola"}
                    </div>
                    {s.name}
                  </button>
                );
              })}
            </div>

            {/* Detalles del escenario */}
            <div className="flex-1 bg-secondary border border-border p-5 rounded-lg flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground">
                  {scenarios[selectedScenario].name}
                </h3>
                <div className="flex gap-2 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded border border-border bg-primary uppercase">
                    Probabilidad: {scenarios[selectedScenario].probability_pct}%
                  </span>
                  <span className="px-2 py-0.5 rounded border border-border bg-primary uppercase">
                    Confianza: {scenarios[selectedScenario].confidence}
                  </span>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-dim/70 italic">
                "{scenarios[selectedScenario].narrative}"
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-semibold font-mono text-accent uppercase tracking-wider">
                    Factores que lo respaldan
                  </h4>
                  <ul className="list-disc pl-4 text-xs text-dim/70 flex flex-col gap-1">
                    {scenarios[selectedScenario].supporting_factors.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-semibold font-mono text-destructive uppercase tracking-wider">
                    Condiciones de invalidación
                  </h4>
                  <ul className="list-disc pl-4 text-xs text-dim/70 flex flex-col gap-1">
                    {scenarios[selectedScenario].invalidation_conditions.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border-t border-border/45 pt-3">
                <div>
                  <span className="text-[10px] font-mono text-dim/70 block uppercase mb-1">Aceleradores de Probabilidad:</span>
                  <div className="text-xs text-dim/70">{scenarios[selectedScenario].probability_boosters.join(", ")}</div>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-dim/70 block uppercase mb-1">Desaceleradores de Probabilidad:</span>
                  <div className="text-xs text-dim/70">{scenarios[selectedScenario].probability_decliners.join(", ")}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "regimes" && (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-mono text-dim/70">
              Clasificaciones activadas por el motor de reglas en base al análisis de peso y condiciones cuantitativas:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {regimes.map((r, i) => (
                <div
                  key={i}
                  className={`p-4 border rounded-lg flex flex-col justify-between transition-all ${
                    r.active ? getRegimeColor(r.name) : "border-border/40 bg-secondary/10 opacity-30"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold">{r.name}</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-border bg-primary">
                        {r.active ? "ACTIVO" : "INACTIVO"}
                      </span>
                    </div>
                    <p className="text-xs text-dim/70 leading-relaxed mb-3">
                      {r.description}
                    </p>
                    
                    {r.active && (
                      <div className="flex flex-col gap-2 border-t border-border/20 pt-2 text-[11px]">
                        <div>
                          <strong className="font-mono text-foreground">Comportamiento esperado:</strong>{" "}
                          <span className="text-dim/70">{r.expected_behavior}</span>
                        </div>
                        <div>
                          <strong className="font-mono text-foreground">Riesgos:</strong>{" "}
                          <span className="text-dim/70">{r.risks.join(" ")}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {r.active && (
                    <div className="text-[9px] font-mono text-dim/70 mt-3 border-t border-border/10 pt-1 text-right">
                      Confianza de lectura: {r.confidence}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
