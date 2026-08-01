import { useState, useMemo } from "react";
import { Calculator, TrendingUp, TrendingDown, Target, Activity } from "lucide-react";
import type { StrikeExposureOut } from "../types";
import Card from "./ui/Card";

interface Props {
  strikes: StrikeExposureOut[];
  spotPrice: number;
  callWall: number | null;
  putWall: number | null;
  upperBound: number | null;
  lowerBound: number | null;
}

interface ZoneProbability {
  zone: string;
  strike: number;
  probability: number;
  confidence: "high" | "medium" | "low";
  timeframe: string;
  factors: string[];
}

export default function ZoneProbabilityCalculator({ 
  strikes, 
  spotPrice, 
  callWall, 
  putWall, 
  upperBound, 
  lowerBound 
}: Props) {
  const [selectedHorizon, setSelectedHorizon] = useState<"1d" | "1w" | "1m">("1d");
  const [calculationMethod, setCalculationMethod] = useState<"delta" | "gamma" | "combined">("combined");

  // Calcular probabilidades de alcanzar zonas
  const zoneProbabilities = useMemo(() => {
    const probs: ZoneProbability[] = [];
    
    // Definir zonas clave
    const zones = [
      { name: "Call Wall", strike: callWall, type: "resistance" },
      { name: "Put Wall", strike: putWall, type: "support" },
      { name: "Upper Bound", strike: upperBound, type: "expected" },
      { name: "Lower Bound", strike: lowerBound, type: "expected" },
    ].filter(z => z.strike !== null);

    zones.forEach((zone) => {
      if (!zone.strike) return;

      const distance = zone.strike - spotPrice;
      const distancePercent = (distance / spotPrice) * 100;
      const absDistancePercent = Math.abs(distancePercent);

      // Calcular probabilidad basada en distancia y volatilidad implícita
      let probability: number;
      let confidence: "high" | "medium" | "low";
      const factors: string[] = [];

      // Estimar volatilidad promedio de los strikes
      const avgIV = strikes.reduce((sum, s) => {
        const nearbyStrikes = strikes.filter(n => Math.abs(n.strike - s.strike) < 5);
        return sum + nearbyStrikes.reduce((ivSum, ns) => ivSum + (ns as any).implied_volatility || 0, 0) / nearbyStrikes.length;
      }, 0) / strikes.length;

      const annualIV = avgIV || 0.25; // Default 25% si no datos
      const dailyIV = annualIV / Math.sqrt(252);
      const periodMultiplier = selectedHorizon === "1d" ? 1 : selectedHorizon === "1w" ? Math.sqrt(7) : Math.sqrt(30);

      // Cálculo de probabilidad usando distribución normal simplificada
      const standardDeviations = absDistancePercent / (dailyIV * 100 * periodMultiplier);
      
      if (calculationMethod === "delta") {
        // Método basado en delta exposure
        const nearbyStrikes = strikes.filter(s => Math.abs(s.strike - zone.strike) < 5);
        const avgDelta = nearbyStrikes.length > 0 
          ? nearbyStrikes.reduce((sum, s) => sum + s.delta_exposure, 0) / nearbyStrikes.length
          : 0;
        const deltaStrength = Math.abs(avgDelta) / 1000000; // Normalizar
        probability = Math.max(5, Math.min(95, 50 + (deltaStrength * 20) - (standardDeviations * 10)));
        factors.push(`Delta exposure: ${deltaStrength.toFixed(2)}M`);
      } else if (calculationMethod === "gamma") {
        // Método basado en gamma exposure
        const nearbyStrikes = strikes.filter(s => Math.abs(s.strike - zone.strike) < 5);
        const avgGamma = nearbyStrikes.length > 0
          ? nearbyStrikes.reduce((sum, s) => sum + s.gamma_exposure, 0) / nearbyStrikes.length
          : 0;
        const gammaStrength = Math.abs(avgGamma) / 1000000;
        probability = Math.max(5, Math.min(95, 50 + (gammaStrength * 15) - (standardDeviations * 8)));
        factors.push(`Gamma exposure: ${gammaStrength.toFixed(2)}M`);
      } else {
        // Método combinado
        const nearbyStrikes = strikes.filter(s => Math.abs(s.strike - zone.strike) < 5);
        const avgDelta = nearbyStrikes.length > 0 
          ? nearbyStrikes.reduce((sum, s) => sum + s.delta_exposure, 0) / nearbyStrikes.length
          : 0;
        const avgGamma = nearbyStrikes.length > 0
          ? nearbyStrikes.reduce((sum, s) => sum + s.gamma_exposure, 0) / nearbyStrikes.length
          : 0;
        
        const deltaStrength = Math.abs(avgDelta) / 1000000;
        const gammaStrength = Math.abs(avgGamma) / 1000000;
        const combinedStrength = (deltaStrength + gammaStrength) / 2;
        
        probability = Math.max(5, Math.min(95, 50 + (combinedStrength * 18) - (standardDeviations * 9)));
        factors.push(`Delta: ${deltaStrength.toFixed(2)}M`);
        factors.push(`Gamma: ${gammaStrength.toFixed(2)}M`);
      }

      // Ajustar confidence basado en datos disponibles
      if (strikes.length > 20) {
        confidence = "high";
      } else if (strikes.length > 10) {
        confidence = "medium";
      } else {
        confidence = "low";
        factors.push("Datos limitados");
      }

      // Ajustar por dirección
      if (distance < 0) {
        factors.push("Zona below spot");
      } else {
        factors.push("Zona above spot");
      }

      probs.push({
        zone: zone.name,
        strike: zone.strike,
        probability: Math.round(probability),
        confidence,
        timeframe: selectedHorizon,
        factors,
      });
    });

    return probs.sort((a, b) => b.probability - a.probability);
  }, [strikes, spotPrice, callWall, putWall, upperBound, lowerBound, selectedHorizon, calculationMethod]);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "text-success";
      case "medium":
        return "text-warning";
      case "low":
        return "text-danger";
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 70) return "text-success";
    if (probability >= 50) return "text-accent";
    if (probability >= 30) return "text-warning";
    return "text-danger";
  };

  const getIcon = (zone: string) => {
    if (zone.includes("Call")) return <TrendingUp className="w-4 h-4" />;
    if (zone.includes("Put")) return <TrendingDown className="w-4 h-4" />;
    if (zone.includes("Upper")) return <Target className="w-4 h-4" />;
    if (zone.includes("Lower")) return <Target className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  return (
    <Card variant="narrative">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-medium text-white">Zone Probability Calculator</h3>
          </div>
          <div className="flex gap-2">
            {["1d", "1w", "1m"].map((horizon) => (
              <button
                key={horizon}
                onClick={() => setSelectedHorizon(horizon as any)}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                  selectedHorizon === horizon
                    ? "bg-accent text-white"
                    : "bg-secondary text-dim/70 hover:text-foreground"
                }`}
              >
                {horizon.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-text-tertiary uppercase tracking-wider">
          Probabilidad de alcanzar zonas clave
        </p>
      </div>

      {/* Method Selector */}
      <div className="mb-6">
        <div className="text-sm text-dim/70 mb-2">Método de cálculo:</div>
        <div className="flex gap-2">
          {[
            { value: "delta", label: "Delta-Based" },
            { value: "gamma", label: "Gamma-Based" },
            { value: "combined", label: "Combined" },
          ].map((method) => (
            <button
              key={method.value}
              onClick={() => setCalculationMethod(method.value as any)}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                calculationMethod === method.value
                  ? "bg-accent text-white"
                  : "bg-secondary text-dim/70 hover:text-foreground"
              }`}
            >
              {method.label}
            </button>
          ))}
        </div>
      </div>

      {/* Probability Results */}
      <div className="space-y-3">
        {zoneProbabilities.map((zone) => (
          <div
            key={zone.zone}
            className="p-4 bg-surface/30 border border-border rounded-lg hover:border-border-light transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {getIcon(zone.zone)}
                <span className="font-semibold text-white">{zone.zone}</span>
                <span className="text-sm text-dim/70">
                  ${zone.strike?.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`text-2xl font-bold ${getProbabilityColor(zone.probability)}`}>
                  {zone.probability}%
                </div>
                <div className={`text-xs font-mono px-2 py-1 rounded ${getConfidenceColor(zone.confidence)} bg-surface/50`}>
                  {zone.confidence.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Probability Bar */}
            <div className="mb-3">
              <div className="h-2 bg-surface rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    zone.probability >= 70
                      ? "bg-success"
                      : zone.probability >= 50
                      ? "bg-accent"
                      : zone.probability >= 30
                      ? "bg-warning"
                      : "bg-danger"
                  }`}
                  style={{ width: `${zone.probability}%` }}
                />
              </div>
            </div>

            {/* Factors */}
            <div className="flex flex-wrap gap-2">
              {zone.factors.map((factor, index) => (
                <div
                  key={index}
                  className="px-2 py-1 bg-surface/50 border border-border rounded text-xs text-dim/70"
                >
                  {factor}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-3 bg-surface/30 border border-border/50 rounded-lg">
        <div className="flex items-start gap-2">
          <Activity className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
          <div className="text-xs text-dim/70 leading-relaxed">
            <span className="font-semibold text-white">Disclaimer:</span> Las probabilidades son estimaciones basadas en datos actuales de opciones y no garantizan resultados futuros. 
            El mercado puede comportarse de manera impredecible. Estas probabilidades son para fines informativos solamente y no constituyen consejo de inversión.
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="bg-surface/50 rounded-lg p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-dim/60 mb-1">Zona Más Probable</div>
          <div className="text-sm font-bold text-white">
            {zoneProbabilities[0]?.zone || "N/A"}
          </div>
        </div>
        <div className="bg-surface/50 rounded-lg p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-dim/60 mb-1">Probabilidad Máxima</div>
          <div className="text-sm font-bold text-accent">
            {zoneProbabilities[0]?.probability || 0}%
          </div>
        </div>
        <div className="bg-surface/50 rounded-lg p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-dim/60 mb-1">Zonas Analizadas</div>
          <div className="text-sm font-bold text-white">
            {zoneProbabilities.length}
          </div>
        </div>
      </div>
    </Card>
  );
}
