import { useEffect, useState } from "react";
import { marketApi } from "../api/client";
import type { QuestionItem, QueryResponse } from "../types";

interface Props {
  selectedExpiration?: string;
}

export default function MarketQAPanel({ selectedExpiration }: Props) {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [queryResponse, setQueryResponse] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    marketApi.getQuestions()
      .then((res) => {
        setQuestions(res.questions);
        if (res.questions.length > 0) {
          setSelectedKey(res.questions[0].key);
        }
      })
      .catch((e) => setError("Error cargando el catálogo de preguntas: " + String(e)));
  }, []);

  const handleAsk = () => {
    if (!selectedKey) return;
    setLoading(true);
    setError(null);
    setQueryResponse(null);

    marketApi.getQuery({
      question_key: selectedKey,
      expiration: selectedExpiration
    })
      .then(setQueryResponse)
      .catch((err) => setError("Error resolviendo la consulta: " + (err?.message ?? String(err))))
      .finally(() => setLoading(false));
  };

  const getMetricName = (key: string) => {
    if (key === "net_gex") return "Net GEX";
    if (key === "net_dex") return "Net DEX";
    if (key === "put_call_volume_ratio") return "Put/Call Vol Ratio";
    if (key === "vix") return "VIX Index";
    if (key === "vix_percentile") return "VIX Percentile";
    if (key === "spot_vs_zero_gamma") return "Precio vs Zero Gamma";
    if (key === "spot_vs_put_wall") return "Precio vs Put Wall";
    if (key === "spot_vs_max_pain") return "Precio vs Max Pain";
    return key;
  };

  const formatMetricValue = (key: string, val: any) => {
    if (val === null || val === undefined) return "N/A";
    if (typeof val === "number") {
      if (key === "net_gex" || key === "net_dex") {
        const abs = Math.abs(val);
        const sign = val >= 0 ? "+" : "-";
        if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
        if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
        if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
        return `${sign}$${abs.toFixed(0)}`;
      }
      if (key.includes("percentile") || key.includes("ratio")) {
        return val.toFixed(2);
      }
      return val.toFixed(2);
    }
    return String(val);
  };

  return (
    <div className="card">
      <div className="border-b border-border pb-2 mb-4">
        <h2 className="text-base font-bold text-foreground">
          Microestructura & Coberturas: Consultas en Tiempo Real
        </h2>
        <p className="text-xs text-dim/70 mt-1">
          Pregunta al motor por qué se mueve el precio o qué hacen los dealers. Las respuestas se justifican únicamente con datos actuales.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="flex-1 bg-secondary border border-border text-foreground font-mono text-xs px-3 py-2 rounded focus:outline-none focus:border-accent"
        >
          {questions.map((q) => (
            <option key={q.key} value={q.key}>
              [{q.category}] {q.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleAsk}
          disabled={loading || !selectedKey}
          className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-background text-xs font-mono font-bold px-5 py-2 rounded transition-all shadow-md"
        >
          {loading ? "Analizando..." : "Consultar Motor"}
        </button>
      </div>

      {error && (
        <div className="border border-destructive/40 bg-destructive/10 text-destructive text-xs font-mono p-3 rounded mb-4">
          {error}
        </div>
      )}

      {queryResponse && (
        <div className="bg-secondary/40 border border-border/60 p-4 rounded flex flex-col gap-4 animate-fade-in">
          {/* Respuesta Principal */}
          <div className="flex justify-between items-center border-b border-border/40 pb-2">
            <span className="font-mono text-xs uppercase text-dim/70 tracking-wider">
              Diagnóstico Justificado (Confianza: {queryResponse.confidence})
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          </div>

          <div className="text-sm leading-relaxed text-dim/70 whitespace-pre-wrap select-text">
            {queryResponse.answer}
          </div>

          {/* Justificación Cuantitativa (Métricas de Soporte) */}
          {Object.keys(queryResponse.justification_data).length > 0 && (
            <div className="border-t border-border/30 pt-3 mt-1">
              <span className="font-mono text-xs uppercase text-dim/70 block mb-2">
                Datos de respaldo analizados:
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(queryResponse.justification_data).map(([mKey, mVal]) => (
                  <div key={mKey} className="bg-primary border border-border/50 p-2.5 rounded text-center">
                    <div className="text-xs text-dim/70 font-mono truncate uppercase">
                      {getMetricName(mKey)}
                    </div>
                    <div className="text-xs font-bold font-mono text-white mt-1">
                      {formatMetricValue(mKey, mVal)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
