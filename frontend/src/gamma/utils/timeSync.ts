/**
 * Time synchronization utilities for matching SPY options with ^GSPC data
 */

import { SYNC_TOLERANCE_MS } from '../config/chartConfig';

/**
 * Find the nearest timestamp within tolerance
 */
export function findNearestTimestamp(
  target: Date,
  candidates: Date[],
  toleranceMs: number = SYNC_TOLERANCE_MS
): Date | null {
  if (candidates.length === 0) return null;
  
  const targetTime = target.getTime();
  
  // Find closest match
  let closest: Date | null = null;
  let minDiff = Infinity;
  
  for (const candidate of candidates) {
    const diff = Math.abs(candidate.getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = candidate;
    }
  }
  
  // Check if within tolerance
  if (minDiff <= toleranceMs) {
    return closest;
  }
  
  return null;
}

/**
 * Synchronize two datasets by timestamp
 */
export function synchronizeData<T, U>(
  primaryData: Array<{ timestamp: Date; data: T }>,
  secondaryData: Array<{ timestamp: Date; data: U }>,
  toleranceMs: number = SYNC_TOLERANCE_MS
): Array<{ timestamp: Date; primary: T; secondary: U | null }> {
  const result: Array<{ timestamp: Date; primary: T; secondary: U | null }> = [];
  const secondaryTimestamps = secondaryData.map(d => d.timestamp);
  
  for (const primary of primaryData) {
    const matchedTimestamp = findNearestTimestamp(
      primary.timestamp,
      secondaryTimestamps,
      toleranceMs
    );
    
    const secondary = matchedTimestamp
      ? secondaryData.find(d => d.timestamp.getTime() === matchedTimestamp.getTime())?.data ?? null
      : null;
    
    result.push({
      timestamp: primary.timestamp,
      primary: primary.data,
      secondary,
    });
  }
  
  return result;
}

/**
 * Round timestamp to nearest minute
 */
export function roundToMinute(date: Date): Date {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  return rounded;
}

/**
 * Check if two timestamps are within tolerance
 */
export function isWithinTolerance(
  timestamp1: Date,
  timestamp2: Date,
  toleranceMs: number = SYNC_TOLERANCE_MS
): boolean {
  return Math.abs(timestamp1.getTime() - timestamp2.getTime()) <= toleranceMs;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(date: Date, includeSeconds: boolean = false): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  if (includeSeconds) {
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
  
  return `${hours}:${minutes}`;
}
