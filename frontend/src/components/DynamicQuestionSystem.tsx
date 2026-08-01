import { useState, useMemo } from "react";
import { MessageCircle, Send, Lightbulb, ChevronRight } from "lucide-react";
import Card from "./ui/Card";
import type { IntelligenceResponse } from "../types";

interface Question {
  id: string;
  question: string;
  category: "market" | "risk" | "opportunity" | "regime";
  answer?: string;
  insight?: string;
}

interface Props {
  intelligence: IntelligenceResponse | null;
}

const questionTemplates = [
  {
    category: "market" as const,
    templates: [
      "¿Cuál es el sentimiento actual del mercado según los scores?",
      "¿Qué factores están impulsando el movimiento actual?",
      "¿Cómo está el equilibrio entre bullish y bearish?",
    ],
  },
  {
    category: "risk" as const,
    templates: [
      "¿Cuál es el nivel de riesgo actual?",
      "¿Qué riesgos deberíamos monitorear?",
      "¿Estamos en un régimen de alta volatilidad?",
    ],
  },
  {
    category: "opportunity" as const,
    templates: [
      "¿Qué oportunidades existen en el escenario actual?",
      "¿Cuál es el escenario más probable?",
      "¿Qué factores soportan el escenario principal?",
    ],
  },
  {
    category: "regime" as const,
    templates: [
      "¿Qué régimen del mercado está activo?",
      "¿Cómo se describen las características del régimen actual?",
      "¿Qué riesgos están asociados con el régimen actual?",
    ],
  },
];

export default function DynamicQuestionSystem({ intelligence }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Generar preguntas dinámicas basadas en datos
  const generateQuestions = useMemo(() => {
    if (!intelligence) return [];

    const generated: Question[] = [];
    let idCounter = 0;

    // Market questions
    if (intelligence.scores) {
      const bullish = intelligence.scores.bullish_score;
      const bearish = intelligence.scores.bearish_score;
      const sentiment = bullish > bearish ? "bullish" : bearish > bullish ? "bearish" : "neutral";
      
      generated.push({
        id: `q-${idCounter++}`,
        question: `¿Cuál es el sentimiento actual del mercado?`,
        category: "market",
        answer: `El sentimiento actual es ${sentiment} con un score bullish del ${bullish}% y bearish del ${bearish}%.`,
        insight: bullish > bearish 
          ? "El mercado muestra fuerza relativa con mayor presión compradora." 
          : "El mercado muestra debilidad relativa con mayor presión vendedora.",
      });
    }

    // Risk questions
    if (intelligence.scores?.risk_score) {
      const riskLevel = intelligence.scores.risk_score;
      const riskLabel = riskLevel > 70 ? "alto" : riskLevel > 40 ? "moderado" : "bajo";
      
      generated.push({
        id: `q-${idCounter++}`,
        question: `¿Cuál es el nivel de riesgo actual?`,
        category: "risk",
        answer: `El nivel de riesgo es ${riskLabel} (${riskLevel}%).`,
        insight: riskLevel > 70 
          ? "Nivel de riesgo elevado - se recomienda precaución adicional." 
          : "Nivel de riesgo controlado - condiciones normales de mercado.",
      });
    }

    // Scenario questions
    if (intelligence.scenarios) {
      const principal = intelligence.scenarios.principal;
      
      generated.push({
        id: `q-${idCounter++}`,
        question: `¿Cuál es el escenario más probable?`,
        category: "opportunity",
        answer: `El escenario principal tiene una probabilidad del ${principal.probability_pct}%.`,
        insight: principal.narrative.substring(0, 100) + "...",
      });
    }

    // Regime questions
    if (intelligence.regimes && intelligence.regimes.length > 0) {
      const activeRegime = intelligence.regimes.find(r => r.active);
      
      if (activeRegime) {
        generated.push({
          id: `q-${idCounter++}`,
          question: `¿Qué régimen del mercado está activo?`,
          category: "regime",
          answer: `El régimen activo es: ${activeRegime.name}`,
          insight: activeRegime.description.substring(0, 100) + "...",
        });
      }
    }

    return generated;
  }, [intelligence]);

  // Preguntas sugeridas basadas en typing
  const suggestedQuestions = useMemo(() => {
    if (!currentQuestion) return [];
    
    return questionTemplates
      .flatMap(category => 
        category.templates
          .filter(template => 
            template.toLowerCase().includes(currentQuestion.toLowerCase()) ||
            currentQuestion.length < 2
          )
          .map(template => ({
            question: template,
            category: category.category,
          }))
      )
      .slice(0, 5);
  }, [currentQuestion]);

  const handleAskQuestion = (question: string) => {
    if (!question.trim() || !intelligence) return;

    // Generar respuesta basada en datos
    let answer = "";
    let insight = "";
    let category: Question["category"] = "market";

    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes("sentimiento") || lowerQuestion.includes("bullish") || lowerQuestion.includes("bearish")) {
      category = "market";
      if (intelligence.scores) {
        const bullish = intelligence.scores.bullish_score;
        const bearish = intelligence.scores.bearish_score;
        answer = `El sentimiento actual muestra un balance de ${bullish}% bullish vs ${bearish}% bearish.`;
        insight = bullish > bearish 
          ? "Fuerza relativa detectada con mayor presión compradora."
          : "Debilidad relativa detectada con mayor presión vendedora.";
      }
    } else if (lowerQuestion.includes("riesgo") || lowerQuestion.includes("risk")) {
      category = "risk";
      if (intelligence.scores?.risk_score) {
        const risk = intelligence.scores.risk_score;
        const riskLabel = risk > 70 ? "alto" : risk > 40 ? "moderado" : "bajo";
        answer = `El nivel de riesgo actual es ${riskLabel} (${risk}%).`;
        insight = risk > 70 ? "Riesgo elevado - precaución recomendada." : "Riesgo moderado - condiciones normales.";
      }
    } else if (lowerQuestion.includes("escenario") || lowerQuestion.includes("probable")) {
      category = "opportunity";
      if (intelligence.scenarios) {
        const principal = intelligence.scenarios.principal;
        answer = `El escenario principal tiene ${principal.probability_pct}% de probabilidad.`;
        insight = principal.narrative;
      }
    } else if (lowerQuestion.includes("régimen") || lowerQuestion.includes("regime")) {
      category = "regime";
      if (intelligence.regimes) {
        const active = intelligence.regimes.find(r => r.active);
        answer = active ? `Régimen activo: ${active.name}` : "No hay régimen activo detectado.";
        insight = active?.description || "";
      }
    } else {
      answer = "Análisis basado en datos actuales de opciones y mercado.";
      insight = "Los datos muestran condiciones específicas que afectan el comportamiento del precio.";
    }

    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      question,
      category,
      answer,
      insight,
    };

    setQuestions([...questions, newQuestion]);
    setCurrentQuestion("");
    setShowSuggestions(false);
  };

  const getCategoryColor = (category: Question["category"]) => {
    switch (category) {
      case "market":
        return "text-info bg-info/10 border-info/30";
      case "risk":
        return "text-danger bg-danger/10 border-danger/30";
      case "opportunity":
        return "text-success bg-success/10 border-success/30";
      case "regime":
        return "text-accent bg-accent/10 border-accent/30";
    }
  };

  const getCategoryLabel = (category: Question["category"]) => {
    switch (category) {
      case "market":
        return "Mercado";
      case "risk":
        return "Riesgo";
      case "opportunity":
        return "Oportunidad";
      case "regime":
        return "Régimen";
    }
  };

  return (
    <Card variant="narrative">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-medium text-white">Dynamic Question System</h3>
        </div>
        <p className="text-xs text-text-tertiary uppercase tracking-wider">
          Sistema de preguntas interactivas basado en datos del mercado
        </p>
      </div>

      {/* Input Section */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={currentQuestion}
            onChange={(e) => {
              setCurrentQuestion(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
            }}
            onFocus={() => setShowSuggestions(currentQuestion.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Escribe tu pregunta sobre el mercado..."
            className="w-full bg-surface/30 border border-border rounded-lg px-4 py-3 text-white placeholder:text-dim/50 outline-none focus:border-border-light transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter" && currentQuestion.trim()) {
                handleAskQuestion(currentQuestion);
              }
            }}
          />
          <button
            onClick={() => handleAskQuestion(currentQuestion)}
            disabled={!currentQuestion.trim() || !intelligence}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Enviar pregunta"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestions */}
        {showSuggestions && suggestedQuestions.length > 0 && (
          <div className="mt-2 bg-surface border border-border rounded-lg overflow-hidden">
            {suggestedQuestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleAskQuestion(suggestion.question)}
                className="w-full px-4 py-2 text-left text-sm text-dim/70 hover:bg-surface/50 hover:text-foreground transition-colors flex items-center gap-2"
              >
                <Lightbulb className="w-3 h-3 text-accent" />
                {suggestion.question}
                <ChevronRight className="w-3 h-3 ml-auto" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Questions */}
      <div className="mb-6">
        <div className="text-sm text-dim/70 mb-2">Preguntas rápidas:</div>
        <div className="flex flex-wrap gap-2">
          {generateQuestions.slice(0, 3).map((q) => (
            <button
              key={q.id}
              onClick={() => handleAskQuestion(q.question)}
              className="px-3 py-1.5 bg-surface/50 border border-border rounded text-xs text-dim/70 hover:text-foreground hover:border-border-light transition-colors"
            >
              {q.question.substring(0, 40)}...
            </button>
          ))}
        </div>
      </div>

      {/* Questions History */}
      {questions.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-dim/70">Historial de preguntas:</div>
          {questions.map((q) => (
            <div
              key={q.id}
              className="p-4 bg-surface/30 border border-border rounded-lg"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-white">{q.question}</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getCategoryColor(q.category)}`}>
                  {getCategoryLabel(q.category)}
                </span>
              </div>
              {q.answer && (
                <div className="text-sm text-dim/70 mb-2">{q.answer}</div>
              )}
              {q.insight && (
                <div className="p-2 bg-surface/50 border border-border/50 rounded text-xs text-dim/60">
                  <span className="font-semibold text-accent">Insight:</span> {q.insight}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {questions.length === 0 && (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-dim/30 mx-auto mb-4" />
          <p className="text-dim/70 mb-2">No hay preguntas aún</p>
          <p className="text-sm text-dim/50">
            Escribe una pregunta arriba o selecciona una pregunta rápida
          </p>
        </div>
      )}
    </Card>
  );
}
