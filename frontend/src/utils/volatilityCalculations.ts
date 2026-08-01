import type { VolatilityAnalysisResponse } from "../types";

/**
 * Calcula el percentil histórico del VIX actual
 */
export function calculateHistoricalPercentile(
  vixCurrent: number,
  vixMin: number,
  vixMax: number
): number {
  if (vixMax === vixMin) return 50;
  return ((vixCurrent - vixMin) / (vixMax - vixMin)) * 100;
}

/**
 * Determina el régimen de volatilidad basado en el VIX
 */
export function calculateVolatilityRegime(vix: number): {
  type: "Low" | "Normal" | "Elevated" | "Extreme";
  label: string;
  color: string;
  description: string;
} {
  if (vix < 15) {
    return {
      type: "Low",
      label: "Baja Volatilidad",
      color: "text-success",
      description: "Mercado en régimen de baja volatilidad. Buen ambiente para risk-on, pero posible complacencia.",
    };
  } else if (vix < 25) {
    return {
      type: "Normal",
      label: "Volatilidad Normal",
      color: "text-warning",
      description: "Volatilidad en rangos normales. Equilibrio entre riesgo y oportunidad.",
    };
  } else if (vix < 40) {
    return {
      type: "Elevated",
      label: "Volatilidad Elevada",
      color: "text-danger",
      description: "Volatilidad elevada indicando estrés o incertidumbre en el mercado.",
    };
  } else {
    return {
      type: "Extreme",
      label: "Volatilidad Extrema",
      color: "text-destructive",
      description: "Volatilidad extrema. Mercado en pánico o crisis. Oportunidades para inversores contrarian.",
    };
  }
}

/**
 * Calcula el movimiento esperado en puntos
 */
export function calculateExpectedMove(
  spotPrice: number,
  expectedMovePct: number
): number {
  return spotPrice * (expectedMovePct / 100);
}

/**
 * Calcula el rango esperado (bounds)
 */
export function calculateExpectedRange(
  spotPrice: number,
  expectedMovePct: number
): { lower: number; upper: number; range: number } {
  const move = calculateExpectedMove(spotPrice, expectedMovePct);
  return {
    lower: spotPrice - move,
    upper: spotPrice + move,
    range: move * 2,
  };
}

/**
 * Calcula el skew de volatilidad (diferencia entre IV de puts y calls)
 */
export function calculateVolatilitySkew(
  callIV: number,
  putIV: number
): { skew: number; interpretation: string } {
  const skew = putIV - callIV;
  let interpretation = "";

  if (skew > 5) {
    interpretation = "Skew positivo alto - Protección downside cara, fear en el mercado";
  } else if (skew > 2) {
    interpretation = "Skew positivo moderado - Preferencia por puts";
  } else if (skew > -2) {
    interpretation = "Skew neutral - Equilibrio entre calls y puts";
  } else if (skew > -5) {
    interpretation = "Skew negativo moderado - Preferencia por calls";
  } else {
    interpretation = "Skew negativo alto - Euforia o complacencia en el mercado";
  }

  return { skew, interpretation };
}

/**
 * Calcula el term structure de volatilidad
 */
export function calculateTermStructure(
  nearTermIV: number,
  farTermIV: number
): { slope: number; interpretation: string; shape: "contango" | "backwardation" | "flat" } {
  const slope = farTermIV - nearTermIV;
  let shape: "contango" | "backwardation" | "flat" = "flat";
  let interpretation = "";

  if (slope > 2) {
    shape = "contango";
    interpretation = "Contango - Expectativas de volatilidad creciente en el tiempo";
  } else if (slope < -2) {
    shape = "backwardation";
    interpretation = "Backwardation - Volatilidad actual elevada vs expectativas futuras";
  } else {
    interpretation = "Flat - Estructura temporal plana de volatilidad";
  }

  return { slope, interpretation, shape };
}

/**
 * Calcula el IV premium/discount vs volatilidad histórica
 */
export function calculateIVPremium(
  impliedIV: number,
  realizedVol: number
): { premium: number; interpretation: string } {
  const premium = impliedIV - realizedVol;
  let interpretation = "";

  if (premium > 5) {
    interpretation = "Premium significativo - Opciones caras vs volatilidad realizada";
  } else if (premium > 2) {
    interpretation = "Premium moderado - Opciones ligeramente caras";
  } else if (premium > -2) {
    interpretation = "Fair value - Opciones bien valuadas";
  } else if (premium > -5) {
    interpretation = "Discount moderado - Oportunidad en opciones";
  } else {
    interpretation = "Discount significativo - Opciones muy baratas vs volatilidad realizada";
  }

  return { premium, interpretation };
}

/**
 * Calcula el Vega exposure total
 */
export function calculateVegaExposure(
  strikes: Array<{ vega_exposure: number }>
): { totalVega: number; avgVega: number; maxVega: number } {
  if (strikes.length === 0) {
    return { totalVega: 0, avgVega: 0, maxVega: 0 };
  }

  const vegas = strikes.map(s => s.vega_exposure);
  const totalVega = vegas.reduce((sum, v) => sum + v, 0);
  const avgVega = totalVega / vegas.length;
  const maxVega = Math.max(...vegas);

  return { totalVega, avgVega, maxVega };
}

/**
 * Formatea valores de volatilidad para display
 */
export function formatVolatility(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return "N/A";
  return value.toFixed(1) + "%";
}

/**
 * Formatea valores de VIX para display
 */
export function formatVIX(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return "N/A";
  return value.toFixed(2);
}

/**
 * Calcula el riesgo de volatilidad (score 0-100)
 */
export function calculateVolatilityRisk(volAnalysis: VolatilityAnalysisResponse): {
  score: number;
  level: "Low" | "Medium" | "High" | "Extreme";
  factors: string[];
} {
  let score = 0;
  const factors: string[] = [];

  // Factor 1: Nivel de VIX
  if (volAnalysis.vix_current > 40) {
    score += 40;
    factors.push("VIX extremo (>40)");
  } else if (volAnalysis.vix_current > 25) {
    score += 25;
    factors.push("VIX elevado (>25)");
  } else if (volAnalysis.vix_current > 15) {
    score += 10;
    factors.push("VIX en rango normal");
  }

  // Factor 2: Percentil histórico
  if (volAnalysis.vix_percentile > 80) {
    score += 30;
    factors.push("VIX en percentil alto (>80%)");
  } else if (volAnalysis.vix_percentile > 60) {
    score += 15;
    factors.push("VIX sobre su media histórica");
  }

  // Factor 3: Expected move vs ATM IV
  const moveRatio = (volAnalysis.expected_move_used / volAnalysis.atm_iv) * 100;
  if (moveRatio > 120) {
    score += 20;
    factors.push("Expected move desproporcionado");
  } else if (moveRatio > 100) {
    score += 10;
    factors.push("Expected move elevado");
  }

  // Factor 4: Rango de expected move
  const rangeWidth = ((volAnalysis.upper_bound - volAnalysis.lower_bound) / volAnalysis.lower_bound) * 100;
  if (rangeWidth > 10) {
    score += 10;
    factors.push("Rango esperado amplio");
  }

  const level = score >= 70 ? "Extreme" : score >= 50 ? "High" : score >= 30 ? "Medium" : "Low";

  return { score: Math.min(score, 100), level, factors };
}
