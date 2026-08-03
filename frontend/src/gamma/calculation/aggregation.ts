/**
 * 90-day aggregate gamma calculations
 */

import type { StrikeGammaData, GammaSnapshot } from '../types/gammaTypes';

/**
 * Aggregate gamma data across multiple expirations
 */
export function aggregateGammaSnapshots(snapshots: GammaSnapshot[]): GammaSnapshot {
  if (snapshots.length === 0) {
    throw new Error('Cannot aggregate empty snapshots array');
  }
  
  // Use the most recent timestamp
  const timestamp = new Date(Math.max(...snapshots.map(s => s.timestamp.getTime())));
  
  // Use the spot price from the most recent snapshot
  const mostRecent = snapshots.reduce((latest, current) =>
    current.timestamp > latest.timestamp ? current : latest
  );
  
  const spotPrice = mostRecent.spotPrice;
  const indexPrice = mostRecent.indexPrice;
  
  // Aggregate strikes by strike price
  const strikeMap = new Map<number, StrikeGammaData>();
  
  for (const snapshot of snapshots) {
    for (const strike of snapshot.strikes) {
      const existing = strikeMap.get(strike.strike);
      
      if (existing) {
        strikeMap.set(strike.strike, {
          ...existing,
          callGamma: existing.callGamma + strike.callGamma,
          putGamma: existing.putGamma + strike.putGamma,
          netGamma: existing.netGamma + strike.netGamma,
          callGex: existing.callGex + strike.callGex,
          putGex: existing.putGex + strike.putGex,
          netGex: existing.netGex + strike.netGex,
          openInterestGamma: existing.openInterestGamma + strike.openInterestGamma,
          volumeGamma: existing.volumeGamma + strike.volumeGamma,
        });
      } else {
        strikeMap.set(strike.strike, { ...strike });
      }
    }
  }
  
  // Convert map to array and sort
  const strikes = Array.from(strikeMap.values()).sort((a, b) => a.strike - b.strike);
  
  // Calculate total net GEX
  const totalNetGex = snapshots.reduce((sum, s) => sum + s.totalNetGex, 0);
  
  // Recalculate key levels based on aggregated data
  const zeroGamma = findAggregatedZeroGamma(strikes, spotPrice);
  const callWall = findAggregatedCallWall(strikes);
  const putWall = findAggregatedPutWall(strikes);
  const majorPositiveGamma = callWall;
  const majorNegativeGamma = putWall;
  
  return {
    timestamp,
    strikes,
    spotPrice,
    indexPrice,
    totalNetGex,
    zeroGamma,
    callWall,
    putWall,
    majorPositiveGamma,
    majorNegativeGamma,
  };
}

/**
 * Find zero gamma in aggregated data
 */
function findAggregatedZeroGamma(strikes: StrikeGammaData[], spotPrice: number): number | null {
  if (strikes.length === 0) return null;
  
  for (let i = 0; i < strikes.length - 1; i++) {
    const current = strikes[i];
    const next = strikes[i + 1];
    
    if (
      (current.netGamma <= 0 && next.netGamma >= 0) ||
      (current.netGamma >= 0 && next.netGamma <= 0)
    ) {
      const ratio = Math.abs(current.netGamma) / (Math.abs(current.netGamma) + Math.abs(next.netGamma));
      return current.strike + ratio * (next.strike - current.strike);
    }
  }
  
  return null;
}

/**
 * Find call wall in aggregated data
 */
function findAggregatedCallWall(strikes: StrikeGammaData[]): number | null {
  const positiveStrikes = strikes.filter(s => s.netGamma > 0);
  if (positiveStrikes.length === 0) return null;
  
  const maxStrike = positiveStrikes.reduce((max, current) =>
    current.netGamma > max.netGamma ? current : max
  );
  
  return maxStrike.strike;
}

/**
 * Find put wall in aggregated data
 */
function findAggregatedPutWall(strikes: StrikeGammaData[]): number | null {
  const negativeStrikes = strikes.filter(s => s.netGamma < 0);
  if (negativeStrikes.length === 0) return null;
  
  const minStrike = negativeStrikes.reduce((min, current) =>
    current.netGamma < min.netGamma ? current : min
  );
  
  return minStrike.strike;
}

/**
 * Filter snapshots by date range
 */
export function filterSnapshotsByDate(
  snapshots: GammaSnapshot[],
  startDate: Date,
  endDate: Date
): GammaSnapshot[] {
  return snapshots.filter(
    s => s.timestamp >= startDate && s.timestamp <= endDate
  );
}

/**
 * Get snapshots within last N days
 */
export function getRecentSnapshots(
  snapshots: GammaSnapshot[],
  days: number
): GammaSnapshot[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return filterSnapshotsByDate(snapshots, cutoffDate, new Date());
}
