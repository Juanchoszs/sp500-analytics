/**
 * Core Gamma Exposure calculations
 */

import type { StrikeGammaData, GammaLevel } from '../types/gammaTypes';

/**
 * Calculate Call Gamma Exposure for a strike
 */
export function calculateCallGex(
  strike: number,
  spot: number,
  callOi: number,
  callVolume: number,
  callGamma: number
): number {
  // GEX = 0.1 * $Gamma * Spot Price * Open Interest
  // This is a simplified calculation - production would use actual gamma values
  const gammaExposure = 0.1 * callGamma * spot * callOi;
  return gammaExposure;
}

/**
 * Calculate Put Gamma Exposure for a strike
 */
export function calculatePutGex(
  strike: number,
  spot: number,
  putOi: number,
  putVolume: number,
  putGamma: number
): number {
  // GEX = 0.1 * $Gamma * Spot Price * Open Interest
  const gammaExposure = 0.1 * putGamma * spot * putOi;
  return gammaExposure;
}

/**
 * Calculate Net Gamma Exposure
 */
export function calculateNetGex(callGex: number, putGex: number): number {
  return callGex - putGex;
}

/**
 * Calculate Open Interest Gamma
 */
export function calculateOiGamma(
  callOi: number,
  putOi: number,
  callGamma: number,
  putGamma: number,
  spot: number
): number {
  const callOiGamma = 0.1 * callGamma * spot * callOi;
  const putOiGamma = 0.1 * putGamma * spot * putOi;
  return callOiGamma + putOiGamma;
}

/**
 * Calculate Volume Gamma
 */
export function calculateVolumeGamma(
  callVolume: number,
  putVolume: number,
  callGamma: number,
  putGamma: number,
  spot: number
): number {
  const callVolGamma = 0.1 * callGamma * spot * callVolume;
  const putVolGamma = 0.1 * putGamma * spot * putVolume;
  return callVolGamma + putVolGamma;
}

/**
 * Find Zero Gamma level (where net gamma crosses zero)
 */
export function findZeroGamma(strikes: StrikeGammaData[], spotPrice: number): number | null {
  if (strikes.length === 0) return null;
  
  // Sort strikes by price
  const sorted = [...strikes].sort((a, b) => a.strike - b.strike);
  
  // Find where net gamma crosses zero
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    if (
      (current.netGamma <= 0 && next.netGamma >= 0) ||
      (current.netGamma >= 0 && next.netGamma <= 0)
    ) {
      // Linear interpolation
      const ratio = Math.abs(current.netGamma) / (Math.abs(current.netGamma) + Math.abs(next.netGamma));
      return current.strike + ratio * (next.strike - current.strike);
    }
  }
  
  return null;
}

/**
 * Find Call Wall (maximum positive gamma)
 */
export function findCallWall(strikes: StrikeGammaData[]): number | null {
  const positiveStrikes = strikes.filter(s => s.netGamma > 0);
  if (positiveStrikes.length === 0) return null;
  
  const maxStrike = positiveStrikes.reduce((max, current) =>
    current.netGamma > max.netGamma ? current : max
  );
  
  return maxStrike.strike;
}

/**
 * Find Put Wall (maximum negative gamma)
 */
export function findPutWall(strikes: StrikeGammaData[]): number | null {
  const negativeStrikes = strikes.filter(s => s.netGamma < 0);
  if (negativeStrikes.length === 0) return null;
  
  const minStrike = negativeStrikes.reduce((min, current) =>
    current.netGamma < min.netGamma ? current : min
  );
  
  return minStrike.strike;
}

/**
 * Find Major Positive Gamma level
 */
export function findMajorPositiveGamma(strikes: StrikeGammaData[]): number | null {
  return findCallWall(strikes);
}

/**
 * Find Major Negative Gamma level
 */
export function findMajorNegativeGamma(strikes: StrikeGammaData[]): number | null {
  return findPutWall(strikes);
}

/**
 * Calculate all gamma levels
 */
export function calculateGammaLevels(strikes: StrikeGammaData[]): GammaLevel[] {
  const levels: GammaLevel[] = [];
  
  const zeroGamma = findZeroGamma(strikes, 0);
  if (zeroGamma) {
    levels.push({
      level: zeroGamma,
      type: 'zero_gamma',
      strength: 1.0,
    });
  }
  
  const callWall = findCallWall(strikes);
  if (callWall) {
    levels.push({
      level: callWall,
      type: 'call_wall',
      strength: 0.9,
    });
  }
  
  const putWall = findPutWall(strikes);
  if (putWall) {
    levels.push({
      level: putWall,
      type: 'put_wall',
      strength: 0.9,
    });
  }
  
  const majorPositive = findMajorPositiveGamma(strikes);
  if (majorPositive && majorPositive !== callWall) {
    levels.push({
      level: majorPositive,
      type: 'major_positive',
      strength: 0.8,
    });
  }
  
  const majorNegative = findMajorNegativeGamma(strikes);
  if (majorNegative && majorNegative !== putWall) {
    levels.push({
      level: majorNegative,
      type: 'major_negative',
      strength: 0.8,
    });
  }
  
  return levels.sort((a, b) => b.strength - a.strength);
}
