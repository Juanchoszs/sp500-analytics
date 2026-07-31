import { useEffect, useState } from "react";
import { marketApi } from "../api/client";
import { Search, BookOpen, TrendingUp, AlertCircle, CheckCircle, Clock, ChevronRight } from "lucide-react";
import LoadingState from "../components/ui/LoadingState";
import ErrorState from "../components/ui/ErrorState";
import Card from "../components/ui/Card";
import type { QuestionsListResponse, QueryResponse, QuestionItem } from "../types";

const TICKER = "SPY";

export default function Research() {
  const [questions, setQuestions] = useState<QuestionsListResponse | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = () => {
    setLoading(true);
    setError(null);
    marketApi.getQuestions()
      .then(setQuestions)
      .catch((err) => setError(err?.message ?? "Error al cargar preguntas"))
      .finally(() => setLoading(false));
  };

  const handleQuestionSelect = (question: QuestionItem) => {
    setSelectedQuestion(question);
    setQueryResult(null);
    executeQuery(question);
  };

  const executeQuery = (question: QuestionItem) => {
    setLoading(true);
    setError(null);
    marketApi.getQuery({ 
      ticker: TICKER, 
      question_key: question.key 
    })
      .then(setQueryResult)
      .catch((err) => setError(err?.message ?? "Error al ejecutar consulta"))
      .finally(() => setLoading(false));
  };

  const filteredQuestions = questions?.questions.filter(q => 
    q.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const groupedQuestions = filteredQuestions.reduce((acc, question) => {
    if (!acc[question.category]) {
      acc[question.category] = [];
    }
    acc[question.category].push(question);
    return acc;
  }, {} as Record<string, QuestionItem[]>);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "High": return "text-success bg-success/10 border-success/30";
      case "Medium": return "text-warning bg-warning/10 border-warning/30";
      case "Low": return "text-danger bg-danger/10 border-danger/30";
      default: return "text-text-secondary bg-surface/50 border-border";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 font-sans p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">Research & Analysis</h1>
            <p className="text-sm text-text-secondary">
              Motor de inteligencia para consultas de mercado
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar preguntas o análisis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg pl-12 pr-4 py-3 text-text-primary outline-none focus:border-border-light transition-colors"
          />
        </div>
      </div>

      {error && (
        <ErrorState
          title="Error de conexión"
          message={error}
          action={{ label: "Reintentar", onClick: fetchQuestions }}
        />
      )}

      {loading && !questions && (
        <LoadingState message="Cargando motor de investigación..." />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Questions Panel */}
        <div className="lg:col-span-1">
          <Card variant="narrative">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-medium text-white">Preguntas Disponibles</h3>
            </div>
            
            {Object.entries(groupedQuestions).map(([category, categoryQuestions]) => (
              <div key={category} className="mb-6">
                <div className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
                  {category}
                </div>
                <div className="space-y-2">
                  {categoryQuestions.map((question) => (
                    <button
                      key={question.key}
                      onClick={() => handleQuestionSelect(question)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedQuestion?.key === question.key
                          ? "bg-accent/10 border-accent text-white"
                          : "bg-surface/50 border-border hover:border-border-light text-text-secondary"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{question.label}</span>
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {filteredQuestions.length === 0 && (
              <div className="text-center py-8 text-text-tertiary">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No se encontraron preguntas</p>
              </div>
            )}
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          {selectedQuestion && (
            <Card variant="narrative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  <h3 className="text-lg font-medium text-white">Resultados</h3>
                </div>
                {queryResult && (
                  <div className={`text-xs font-mono px-3 py-1 rounded-full border ${getConfidenceColor(queryResult.confidence)}`}>
                    Confianza: {queryResult.confidence}
                  </div>
                )}
              </div>

              <div className="mb-4 p-4 bg-surface/50 rounded-lg border border-border">
                <div className="text-sm text-text-tertiary mb-1">Pregunta seleccionada:</div>
                <div className="text-base font-medium text-white">{selectedQuestion.label}</div>
              </div>

              {loading && !queryResult && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin mb-4" />
                  <div className="text-sm text-text-secondary">Analizando datos...</div>
                </div>
              )}

              {queryResult && (
                <div className="space-y-4">
                  <div className="p-4 bg-surface/30 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <span className="font-medium text-white">Respuesta</span>
                    </div>
                    <p className="text-text-secondary leading-relaxed">{queryResult.answer}</p>
                  </div>

                  {Object.keys(queryResult.justification_data || {}).length > 0 && (
                    <div className="p-4 bg-surface/30 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="w-5 h-5 text-info" />
                        <span className="font-medium text-white">Datos de Justificación</span>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(queryResult.justification_data).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center text-sm">
                            <span className="text-text-tertiary capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="text-text-primary font-mono">
                              {typeof value === 'number' ? value.toFixed(2) : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!selectedQuestion && (
                <div className="text-center py-12 text-text-tertiary">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg mb-2">Selecciona una pregunta</p>
                  <p className="text-sm">Elige una pregunta del panel izquierdo para ver el análisis</p>
                </div>
              )}
            </Card>
          )}

          {!selectedQuestion && (
            <Card variant="narrative">
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-text-tertiary opacity-30" />
                <h3 className="text-lg font-medium text-white mb-2">Motor de Investigación</h3>
                <p className="text-text-secondary max-w-md mx-auto">
                  Selecciona una pregunta del panel izquierdo para ejecutar análisis inteligentes 
                  sobre la estructura de opciones, flujo de órdenes y posicionamiento de dealers.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}