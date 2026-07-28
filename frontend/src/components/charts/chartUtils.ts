import type { StrikeExposureOut } from "../../types";

export function formatCompact(value: number): string {
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + "B";
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return (value / 1_000).toFixed(1) + "K";
  return value.toFixed(0);
}

export function formatContracts(value: number): string {
  return formatCompact(Math.abs(value));
}

export function filterStrikesAroundSpot(
  strikes: StrikeExposureOut[],
  spotPrice: number,
  window = 30,
): StrikeExposureOut[] {
  const sorted = [...strikes].sort((a, b) => a.strike - b.strike);
  if (sorted.length === 0) return [];
  const idx = closestIndex(sorted, spotPrice);
  const start = Math.max(0, idx - window);
  const end = Math.min(sorted.length, idx + window + 1);
  return sorted.slice(start, end);
}

export function closestIndex(sorted: StrikeExposureOut[], value: number): number {
  let best = 0;
  let bestDiff = Infinity;
  sorted.forEach((s, i) => {
    const diff = Math.abs(s.strike - value);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  });
  return best;
}

export function findDominantStrike(
  strikes: StrikeExposureOut[],
  accessor: (s: StrikeExposureOut) => number,
): number | null {
  if (strikes.length === 0) return null;
  const best = strikes.reduce((a, b) => (Math.abs(accessor(a)) >= Math.abs(accessor(b)) ? a : b));
  const val = accessor(best);
  return val !== 0 ? best.strike : null;
}

export function computeOiQuality(strikes: StrikeExposureOut[]): {
  totalOi: number;
  zeroOiPct: number;
  isHealthy: boolean;
} {
  const totalOi = strikes.reduce((sum, s) => sum + s.call_oi + s.put_oi, 0);
  const zeroCount = strikes.filter((s) => s.call_oi === 0 && s.put_oi === 0).length;
  const zeroOiPct = strikes.length ? (zeroCount / strikes.length) * 100 : 100;
  return { totalOi, zeroOiPct, isHealthy: totalOi > 0 && zeroOiPct < 80 };
}

export interface DexChartPoint {
  strike: string;
  strikeNum: number;
  callDex: number;
  putDex: number;
  netDex: number;
  cumNetDex: number;
  isDominant: boolean;
  dealerAction: "buy" | "sell" | "neutral";
}

export function buildDexChartData(
  strikes: StrikeExposureOut[],
  spotPrice: number,
  window = 30,
): DexChartPoint[] {
  const filtered = filterStrikesAroundSpot(strikes, spotPrice, window);
  let cumulative = 0;
  const dominant = findDominantStrike(filtered, (s) => s.delta_exposure);
  const range = Math.max(...filtered.map((s) => Math.abs(s.delta_exposure)), 1);

  return filtered.map((s) => {
    const callDex = Math.max(-(s.call_delta_exposure ?? 0), 0);
    const putDex = Math.max(s.put_delta_exposure ?? 0, 0);
    const netDex = s.delta_exposure;
    cumulative += netDex;

    let dealerAction: "buy" | "sell" | "neutral" = "neutral";
    if (netDex > range * 0.08) dealerAction = "sell";
    else if (netDex < -range * 0.08) dealerAction = "buy";

    return {
      strike: s.strike.toString(),
      strikeNum: s.strike,
      callDex,
      putDex,
      netDex,
      cumNetDex: cumulative,
      isDominant: s.strike === dominant,
      dealerAction,
    };
  });
}

export interface VolumeChartPoint {
  strike: string;
  strikeNum: number;
  callVol: number;
  putVol: number;
  putVolNeg: number;
  netVol: number;
  totalVol: number;
  isHighActivity: boolean;
}

export function buildVolumeChartData(
  strikes: StrikeExposureOut[],
  spotPrice: number,
  window = 30,
): VolumeChartPoint[] {
  const filtered = filterStrikesAroundSpot(strikes, spotPrice, window);
  const maxTotal = Math.max(...filtered.map((s) => s.call_volume + s.put_volume), 1);

  return filtered.map((s) => {
    const totalVol = s.call_volume + s.put_volume;
    return {
      strike: s.strike.toString(),
      strikeNum: s.strike,
      callVol: s.call_volume,
      putVol: s.put_volume,
      putVolNeg: -s.put_volume,
      netVol: s.call_volume - s.put_volume,
      totalVol,
      isHighActivity: totalVol >= maxTotal * 0.6,
    };
  });
}

export interface OiChartPoint {
  strike: string;
  strikeNum: number;
  callOi: number;
  putOi: number;
  putOiNeg: number;
  totalOi: number;
  netOi: number;
  isHighConcentration: boolean;
}

export function buildOiChartData(
  strikes: StrikeExposureOut[],
  spotPrice: number,
  window = 35,
): OiChartPoint[] {
  const filtered = filterStrikesAroundSpot(strikes, spotPrice, window);
  const maxTotal = Math.max(...filtered.map((s) => s.call_oi + s.put_oi), 1);

  return filtered.map((s) => ({
    strike: s.strike.toString(),
    strikeNum: s.strike,
    callOi: s.call_oi,
    putOi: s.put_oi,
    putOiNeg: -s.put_oi,
    totalOi: s.call_oi + s.put_oi,
    netOi: s.call_oi - s.put_oi,
    isHighConcentration: s.call_oi + s.put_oi >= maxTotal * 0.5,
  }));
}
