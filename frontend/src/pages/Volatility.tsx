import { useState, useEffect, useMemo } from "react";
import { marketApi } from "../api/client";
import { Download, Info, Activity, TrendingUp, Zap, BarChart3 } from "lucide-react";
import { useReportDownload } from "../hooks/useReportDownload";
import VIXGauge from "../components/VIXGauge";
import ExpectedMoveChart from "../components/ExpectedMoveChart";
import RegimeIndicator from "../components/RegimeIndicator";
import VolatilityInfoPanel from "../components/VolatilityInfoPanel";
import IVSmileChart from "../components/IVSmileChart";
import LoadingState from "../components/ui/LoadingState";
import ErrorState from "../components/ui/ErrorState";
import Card from "../components/ui/Card";
import type { IntelligenceResponse, ExpirationsResponse, OptionsChainResponse } from "../types";
import { calculateVolatilityRisk, formatVolatility } from "../utils/volatilityCalculations";

const TICKER = "SPY";

export default function Volatility() {
  const [expirations, setExpirations] = useState<ExpirationsResponse | null>(null);
  const [selectedExp, setSelectedExp] = useState<string | undefined>(undefined);
  const [intelligence, setIntelligence] = useState<IntelligenceResponse | null>(null);
  const [optionsChain, setOptionsChain] = useState<OptionsChainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDownloading, handleDownloadWord } = useReportDownload();

  useEffect(() => {
    marketApi.getExpirations({ ticker: TICKER }).then(setExpirations).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    const fetchData = () => {
      setLoading(true);
      setError(null);
      
      Promise.all([
        marketApi.getIntelligence({ ticker: TICKER, expiration: selectedExp }),
        marketApi.getOptions({ ticker: TICKER, expiration: selectedExp })
      ])
        .then(([intelData, optionsData]) => {
          setIntelligence(intelData);
          setOptionsChain(optionsData);
        })
        .catch((err) => setError(err?.message ?? "Error al consultar la API"))
        .finally(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [selectedExp]);

  // Memoized calculations for performance
  const volatilityData = useMemo(() => {
    if (!intelligence) return null;
    
    const volAnalysis = intelligence.volatility_analysis;
    const riskScore = calculateVolatilityRisk(volAnalysis);
    
    return {
      volAnalysis,
      riskScore,
      vixCurrent: volAnalysis.vix_current,
      vixMin: volAnalysis.historical_vix_min,
      vixMax: volAnalysis.historical_vix_max,
      vixRank: volAnalysis.vix_rank,
      spotPrice: intelligence.spot_price,
      expectedMovePct: volAnalysis.expected_move_used,
      lowerBound: volAnalysis.lower_bound,
      upperBound: volAnalysis.upper_bound,
      atmIv: volAnalysis.atm_iv,
      regimeType: volAnalysis.regime_type,
      description: volAnalysis.description
    };
  }, [intelligence]);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-wrap gap-3 shadow-lg">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-accent to-ring flex items-center justify-center shadow-lg border border-white/10">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Volatility Analysis</h1>
            <div className="font-mono text-[10px] sm:text-xs text-dim/70 uppercase tracking-wider mt-0.5">
              {TICKER} Options Market Volatility Analysis
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <button
            onClick={() => handleDownloadWord(TICKER, selectedExp)}
            disabled={isDownloading || !intelligence}
            className="flex items-center gap-2 bg-secondary border border-border hover:border-accent text-xs sm:text-sm font-mono px-3 sm:px-4 py-2 rounded-lg transition-all text-foreground disabled:opacity-50 disabled:cursor-not-allowed group focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-primary"
            aria-label="Descargar reporte de análisis de Volatilidad"
            aria-busy={isDownloading}
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" aria-hidden="true" />
            ) : (
              <Download className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">Descargar Reporte</span>
            <span className="sm:hidden">Descargar</span>
          </button>
          <div className="h-8 w-px bg-border hidden sm:block" />
          <label className="font-mono text-xs text-dim/70 uppercase tracking-wider hidden sm:block">Vencimiento</label>
          <select
            className="bg-secondary border border-border rounded-lg text-foreground font-mono text-xs sm:text-sm px-3 sm:px-4 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-primary transition-colors"
            value={selectedExp ?? ""}
            onChange={(e) => setSelectedExp(e.target.value || undefined)}
            aria-label="Seleccionar fecha de vencimiento de opciones"
          >
            <option value="">Nearest</option>
            {expirations?.expirations.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Info Bar */}
      <div className="bg-secondary/30 border-b border-border px-4 sm:px-6 py-3">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-foreground font-medium mb-1">¿Qué es este módulo?</p>
            <p className="text-dim/70">
              Analiza la volatilidad del mercado de opciones de {TICKER}, proporcionando insights sobre el miedo/greedy del mercado,
              expectativas de movimiento futuro a través del VIX y volatilidad implícita, y el régimen actual de volatilidad.
              Estas métricas son cruciales para entender el sentimiento del mercado, gestión de riesgo, y identificación de oportunidades.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-6 border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4 rounded-lg font-mono flex items-center gap-3 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          Error consultando la API: {error}. Verifica que el backend esté corriendo en :8000.
        </div>
      )}

      {loading && !volatilityData && (
        <div className="p-20 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
          <div className="font-mono text-dim/70 text-sm uppercase tracking-wider animate-pulse">Analizando volatilidad del mercado...</div>
        </div>
      )}

      {volatilityData && (
        <main className="flex-1 p-8 flex flex-col gap-8">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6" role="region" aria-label="Métricas clave de Volatilidad">
            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-accent" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">VIX Current</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                {volatilityData.vixCurrent.toFixed(2)}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">
                Índice de volatilidad CBOE
              </p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-accent" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">ATM IV</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                {formatVolatility(volatilityData.atmIv)}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">
                Volatilidad implícita ATM
              </p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-accent" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Expected Move</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                {formatVolatility(volatilityData.expectedMovePct)}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">
                Movimiento esperado
              </p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-accent" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Risk Score</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2" aria-live="polite">
                {volatilityData.riskScore.score}/100
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">
                Nivel: {volatilityData.riskScore.level}
              </p>
            </Card>
          </div>

          {/* VIX Analysis Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <VIXGauge 
              vixCurrent={volatilityData.vixCurrent}
              vixMin={volatilityData.vixMin}
              vixMax={volatilityData.vixMax}
              vixRank={volatilityData.vixRank}
            />
            <RegimeIndicator 
              vix={volatilityData.vixCurrent}
              regimeType={volatilityData.regimeType}
            />
          </div>

          {/* Expected Move Section */}
          <ExpectedMoveChart 
            spotPrice={volatilityData.spotPrice}
            expectedMovePct={volatilityData.expectedMovePct}
            lowerBound={volatilityData.lowerBound}
            upperBound={volatilityData.upperBound}
            atmIv={volatilityData.atmIv}
          />

          {/* IV Smile Chart Section */}
          {optionsChain && (
            <Card variant="chart" className="h-[400px]">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-white mb-1">IV Smile</h3>
                <p className="text-xs text-text-tertiary uppercase tracking-wider">Volatilidad implícita por strike</p>
              </div>
              <IVSmileChart 
                calls={optionsChain.calls}
                puts={optionsChain.puts}
              />
            </Card>
          )}

          {/* Volatility Info Panel */}
          <VolatilityInfoPanel description={volatilityData.description} />

          {/* Risk Factors */}
          {volatilityData.riskScore.factors.length > 0 && (
            <Card variant="narrative">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-white mb-1">Factores de Riesgo</h3>
                <p className="text-xs text-text-tertiary uppercase tracking-wider">Factores contribuyentes al score de riesgo</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {volatilityData.riskScore.factors.map((factor, index) => (
                  <div key={index} className="px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-dim/70">
                    {factor}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </main>
      )}
    </div>
  );
}