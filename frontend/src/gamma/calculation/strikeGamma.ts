/**
 * Per-strike gamma calculations
 */

import type { StrikeGammaData } from '../types/gammaTypes';
import type { StrikeExposureOut } from '../../types';

/**
 * Calculate comprehensive gamma data for a single strike
 */
export function calculateStrikeGamma(
  strike: StrikeExposureOut,
  spotPrice: number,
  callGamma: number,
  putGamma: number
): StrikeGammaData {
  const callGex = calculateStrikeCallGex(strike, spotPrice, callGamma);
  const putGex = calculateStrikePutGex(strike, spotPrice, putGamma);
  const netGex = callGex - putGex;
  
  return {
    strike: strike.strike,
    callGamma,
    putGamma,
    netGamma: strike.gamma_exposure,
    callGex,
    putGex,
    netGex,
    openInterestGamma: calculateStrikeOiGamma(strike, spotPrice, callGamma, putGamma),
    volumeGamma: calculateStrikeVolumeGamma(strike, spotPrice, callGamma, putGamma),
    timestamp: new Date(),
  };
}

/**
 * Calculate Call GEX for a strike
 */
function calculateStrikeCallGex(
  strike: StrikeExposureOut,
  spotPrice: number,
  callGamma: number
): number {
  // GEX = 0.1 * $Gamma * Spot Price * Open Interest
  return 0.1 * callGamma * spotPrice * strike.call_oi;
}

/**
 * Calculate Put GEX for a strike
 */
function calculateStrikePutGex(
  strike: StrikeExposureOut,
  spotPrice: number,
  putGamma: number
): number {
  // GEX = 0.1 * $Gamma * Spot Price * Open Interest
  return 0.1 * putGamma * spotPrice * strike.put_oi;
}

/**
 * Calculate Open Interest Gamma for a strike
 */
function calculateStrikeOiGamma(
  strike: StrikeExposureOut,
  spotPrice: number,
  callGamma: number,
  putGamma: number
): number {
  const callOiGamma = 0.1 * callGamma * spotPrice * strike.call_oi;
  const putOiGamma = 0.1 * putGamma * spotPrice * strike.put_oi;
  return callOiGamma + putOiGamma;
}

/**
 * Calculate Volume Gamma for a strike
 */
function calculateStrikeVolumeGamma(
  strike: StrikeExposureOut,
  spotPrice: number,
  callGamma: number,
  putGamma: number
): number {
  const callVolGamma = 0.1 * callGamma * spotPrice * strike.call_volume;
  const putVolGamma = 0.1 * putGamma * spotPrice * strike.put_volume;
  return callVolGamma + putVolGamma;
}

/**
 * Calculate gamma for array of strikes
 */
export function calculateStrikesGamma(
  strikes: StrikeExposureOut[],
  spotPrice: number,
  gammaMap: Map<number, { callGamma: number; putGamma: number }>
): StrikeGammaData[] {
  return strikes.map(strike => {
    const gammaValues = gammaMap.get(strike.strike) || {
      callGamma: 0.1,
      putGamma: 0.1,
    };
    
    return calculateStrikeGamma(
      strike,
      spotPrice,
      gammaValues.callGamma,
      gammaValues.putGamma
    );
  });
}

/**
 * Create a gamma map from Greeks data
 */
export function createGammaMapFromGreeks(
  greeks: Array<{ strike: number; call_gamma: number; put_gamma: number }>
): Map<number, { callGamma: number; putGamma: number }> {
  const gammaMap = new Map();
  
  for (const greek of greeks) {
    gammaMap.set(greek.strike, {
      callGamma: greek.call_gamma,
      putGamma: greek.put_gamma,
    });
  }
  
  return gammaMap;
}
