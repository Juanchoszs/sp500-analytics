import { useState, useEffect, useMemo, useCallback } from "react";
import { marketApi } from "../api/client";
import { Download, FileText, LayoutGrid, Zap, Keyboard, HelpCircle, X, MessageCircle } from "lucide-react";
import { useReportDownload } from "../hooks/useReportDownload";
import { useMultiFormatExport } from "../hooks/useMultiFormatExport";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import IntelligenceReport from "../components/IntelligenceReport";
import LazyIntelligenceReport from "../components/LazyIntelligenceReport";
import InteractiveZoneHeatmap from "../components/InteractiveZoneHeatmap";
import ZoneProbabilityCalculator from "../components/ZoneProbabilityCalculator";
import PersonalizedDashboard from "../components/PersonalizedDashboard";
import DynamicQuestionSystem from "../components/DynamicQuestionSystem";
import LoadingState from "../components/ui/LoadingState";
import ErrorState from "../components/ui/ErrorState";
import Card from "../components/ui/Card";
import type { IntelligenceResponse, ExpirationsResponse, ExposureResponse } from "../types";

const TICKER = "SPY";

export default function Reports() {
  const [expirations, setExpirations] = useState<ExpirationsResponse | null>(null);
  const [selectedExp, setSelectedExp] = useState<string | undefined>(undefined);
  const [intelligence, setIntelligence] = useState<IntelligenceResponse | null>(null);
  const [exposure, setExposure] = useState<ExposureResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "intelligence" | "zones" | "questions" | "export">("dashboard");
  const [showHelp, setShowHelp] = useState(false);
  
  const { isDownloading, handleDownloadWord } = useReportDownload();
  const { isExporting, handleExport } = useMultiFormatExport();

  // Optimización: memoization de datos
  const zoneData = useMemo(() => {
    if (!exposure) return null;
    return {
      strikes: exposure.strikes,
      spotPrice: exposure.spot_price,
      callWall: exposure.call_wall,
      putWall: exposure.put_wall,
      gammaWall: exposure.gamma_wall,
      zeroGamma: exposure.zero_gamma,
      upperBound: intelligence?.volatility_analysis?.upper_bound,
      lowerBound: intelligence?.volatility_analysis?.lower_bound,
    };
  }, [exposure, intelligence?.volatility_analysis?.upper_bound, intelligence?.volatility_analysis?.lower_bound]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "e",
      ctrlKey: true,
      action: () => {
        if (intelligence) {
          handleExport(TICKER, selectedExp, intelligence, "word");
        }
      },
      description: "Exportar Word",
    },
    {
      key: "d",
      ctrlKey: true,
      action: () => setActiveTab("dashboard"),
      description: "Ir a Dashboard",
    },
    {
      key: "i",
      ctrlKey: true,
      action: () => setActiveTab("intelligence"),
      description: "Ir a Intelligence",
    },
    {
      key: "z",
      ctrlKey: true,
      action: () => setActiveTab("zones"),
      description: "Ir a Zonas",
    },
    {
      key: "q",
      ctrlKey: true,
      action: () => setActiveTab("questions"),
      description: "Ir a Preguntas",
    },
    {
      key: "x",
      ctrlKey: true,
      action: () => setActiveTab("export"),
      description: "Ir a Export",
    },
    {
      key: "?",
      action: () => setShowHelp(!showHelp),
      description: "Mostrar ayuda",
    },
  ]);

  useEffect(() => {
    marketApi.getExpirations({ ticker: TICKER }).then(setExpirations).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    const fetchData = () => {
      setLoading(true);
      setError(null);
      const params = { ticker: TICKER, expiration: selectedExp };
      
      Promise.all([
        marketApi.getIntelligence(params),
        marketApi.getExposure(params)
      ])
        .then(([intelData, expData]) => {
          setIntelligence(intelData);
          setExposure(expData);
        })
        .catch((err) => setError(err?.message ?? "Error al consultar la API"))
        .finally(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [selectedExp]);

  const handleExportFormat = useCallback((format: "word" | "pdf" | "excel" | "html" | "markdown") => {
    if (intelligence) {
      handleExport(TICKER, selectedExp, intelligence, format);
    }
  }, [intelligence, selectedExp, handleExport]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
              <Zap className="w-6 h-6 text-accent" />
              Intelligence Reports
            </h1>
            <p className="text-sm text-text-secondary">
              Análisis narrativo completo del mercado con zonas de opciones y exportación multi-formato
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-2 rounded-lg bg-surface border border-border hover:border-border-light transition-colors"
              aria-label="Mostrar ayuda"
            >
              <Keyboard className="w-4 h-4 text-dim/70" />
            </button>
            <select
              className="bg-surface border border-border rounded-lg text-text-primary text-sm px-4 py-2 outline-none focus:border-border-light transition-colors"
              value={selectedExp ?? ""}
              onChange={(e) => setSelectedExp(e.target.value || undefined)}
            >
              <option value="">Nearest</option>
              {expirations?.expirations.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-border pb-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "dashboard"
                ? "text-accent border-b-2 border-accent"
                : "text-dim/70 hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("intelligence")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "intelligence"
                ? "text-accent border-b-2 border-accent"
                : "text-dim/70 hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" />
            Intelligence
          </button>
          <button
            onClick={() => setActiveTab("zones")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "zones"
                ? "text-accent border-b-2 border-accent"
                : "text-dim/70 hover:text-foreground"
            }`}
          >
            <Zap className="w-4 h-4" />
            Zonas
          </button>
          <button
            onClick={() => setActiveTab("questions")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "questions"
                ? "text-accent border-b-2 border-accent"
                : "text-dim/70 hover:text-foreground"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Preguntas
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "export"
                ? "text-accent border-b-2 border-accent"
                : "text-dim/70 hover:text-foreground"
            }`}
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-accent" />
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 rounded hover:bg-destructive/20 text-dim/70 hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-dim/70">Exportar Word</span>
                <kbd className="px-2 py-1 bg-surface/50 border border-border rounded text-xs font-mono text-foreground">
                  Ctrl + E
                </kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-dim/70">Ir a Dashboard</span>
                <kbd className="px-2 py-1 bg-surface/50 border border-border rounded text-xs font-mono text-foreground">
                  Ctrl + D
                </kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-dim/70">Ir a Intelligence</span>
                <kbd className="px-2 py-1 bg-surface/50 border border-border rounded text-xs font-mono text-foreground">
                  Ctrl + I
                </kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-dim/70">Ir a Zonas</span>
                <kbd className="px-2 py-1 bg-surface/50 border border-border rounded text-xs font-mono text-foreground">
                  Ctrl + Z
                </kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-dim/70">Ir a Preguntas</span>
                <kbd className="px-2 py-1 bg-surface/50 border border-border rounded text-xs font-mono text-foreground">
                  Ctrl + Q
                </kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-dim/70">Ir a Export</span>
                <kbd className="px-2 py-1 bg-surface/50 border border-border rounded text-xs font-mono text-foreground">
                  Ctrl + X
                </kbd>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-dim/70">Mostrar ayuda</span>
                <kbd className="px-2 py-1 bg-surface/50 border border-border rounded text-xs font-mono text-foreground">
                  ?
                </kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <ErrorState
          title="Error de conexión"
          message={error}
          action={{ label: "Reintentar", onClick: () => window.location.reload() }}
        />
      )}

      {loading && !intelligence && (
        <LoadingState message="Generando inteligencia de mercado..." />
      )}

      {intelligence && (
        <div className="flex flex-col gap-8">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <PersonalizedDashboard intelligence={intelligence} exposure={exposure} />
          )}

          {/* Intelligence Tab */}
          {activeTab === "intelligence" && (
            <Card variant="narrative">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-info" />
                  <h3 className="text-lg font-medium text-white">Market Intelligence Report</h3>
                </div>
                <p className="text-xs text-text-tertiary uppercase tracking-wider">
                  Análisis completo generado por IA
                </p>
              </div>
              <LazyIntelligenceReport intelligence={intelligence} />
            </Card>
          )}

          {/* Zones Tab */}
          {activeTab === "zones" && zoneData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InteractiveZoneHeatmap
                strikes={zoneData.strikes}
                spotPrice={zoneData.spotPrice}
                callWall={zoneData.callWall}
                putWall={zoneData.putWall}
                gammaWall={zoneData.gammaWall}
                zeroGamma={zoneData.zeroGamma}
              />
              <ZoneProbabilityCalculator
                strikes={zoneData.strikes}
                spotPrice={zoneData.spotPrice}
                callWall={zoneData.callWall}
                putWall={zoneData.putWall}
                upperBound={zoneData.upperBound}
                lowerBound={zoneData.lowerBound}
              />
            </div>
          )}

          {/* Questions Tab */}
          {activeTab === "questions" && (
            <DynamicQuestionSystem intelligence={intelligence} />
          )}

          {/* Export Tab */}
          {activeTab === "export" && (
            <Card variant="narrative">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-5 h-5 text-accent" />
                  <h3 className="text-lg font-medium text-white">Multi-Format Export</h3>
                </div>
                <p className="text-xs text-text-tertiary uppercase tracking-wider">
                  Exporta tu reporte en múltiples formatos
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Word */}
                <button
                  onClick={() => handleExportFormat("word")}
                  disabled={isExporting.word || !intelligence}
                  className="p-6 bg-surface/30 border border-border rounded-lg hover:border-border-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    {isExporting.word && (
                      <div className="w-4 h-4 border-2 border-border-light border-t-text-tertiary rounded-full animate-spin" />
                    )}
                  </div>
                  <h4 className="font-medium text-white mb-1">Microsoft Word</h4>
                  <p className="text-xs text-dim/70">Formato .docx con formato completo</p>
                </button>

                {/* PDF */}
                <button
                  onClick={() => handleExportFormat("pdf")}
                  disabled={isExporting.pdf || !intelligence}
                  className="p-6 bg-surface/30 border border-border rounded-lg hover:border-border-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-red-400" />
                    </div>
                    {isExporting.pdf && (
                      <div className="w-4 h-4 border-2 border-border-light border-t-text-tertiary rounded-full animate-spin" />
                    )}
                  </div>
                  <h4 className="font-medium text-white mb-1">PDF</h4>
                  <p className="text-xs text-dim/70">Formato PDF universal</p>
                </button>

                {/* Excel */}
                <button
                  onClick={() => handleExportFormat("excel")}
                  disabled={isExporting.excel || !intelligence}
                  className="p-6 bg-surface/30 border border-border rounded-lg hover:border-border-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-green-400" />
                    </div>
                    {isExporting.excel && (
                      <div className="w-4 h-4 border-2 border-border-light border-t-text-tertiary rounded-full animate-spin" />
                    )}
                  </div>
                  <h4 className="font-medium text-white mb-1">Excel</h4>
                  <p className="text-xs text-dim/70">Formato CSV para análisis de datos</p>
                </button>

                {/* HTML */}
                <button
                  onClick={() => handleExportFormat("html")}
                  disabled={isExporting.html || !intelligence}
                  className="p-6 bg-surface/30 border border-border rounded-lg hover:border-border-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-orange-400" />
                    </div>
                    {isExporting.html && (
                      <div className="w-4 h-4 border-2 border-border-light border-t-text-tertiary rounded-full animate-spin" />
                    )}
                  </div>
                  <h4 className="font-medium text-white mb-1">HTML</h4>
                  <p className="text-xs text-dim/70">Formato HTML con estilos</p>
                </button>

                {/* Markdown */}
                <button
                  onClick={() => handleExportFormat("markdown")}
                  disabled={isExporting.markdown || !intelligence}
                  className="p-6 bg-surface/30 border border-border rounded-lg hover:border-border-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-400" />
                    </div>
                    {isExporting.markdown && (
                      <div className="w-4 h-4 border-2 border-border-light border-t-text-tertiary rounded-full animate-spin" />
                    )}
                  </div>
                  <h4 className="font-medium text-white mb-1">Markdown</h4>
                  <p className="text-xs text-dim/70">Formato .md para documentación</p>
                </button>
              </div>

              {/* Export Info */}
              <div className="mt-6 p-4 bg-surface/30 border border-border/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-dim/70 leading-relaxed">
                    <span className="font-semibold text-white">Información:</span> Los reportes se generan automáticamente con los datos más recientes del mercado. 
                    Los formatos PDF y HTML incluyen visualizaciones estilizadas, mientras que Excel/CSV proporcionan datos estructurados para análisis.
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
