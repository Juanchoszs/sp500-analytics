/**
 * Max change detection for gamma exposure
 */

import type { MaxChangeData, GammaSnapshot } from '../types/gammaTypes';

export class MaxChangeDetector {
  /**
   * Detect largest gamma increase for a specific time window
   */
  static detectMaxChange(
    snapshots: GammaSnapshot[],
    timeWindow: '1m' | '5m' | '10m' | '15m' | '30m'
  ): MaxChangeData | null {
    if (snapshots.length < 2) return null;
    
    const windowMinutes = parseInt(timeWindow.replace('m', ''));
    const maxChange: MaxChangeData = {
      timeWindow,
      strike: 0,
      delta: 0,
      timestamp: new Date(),
    };
    
    // Calculate window size in snapshots (assuming 1-minute intervals)
    const windowSize = windowMinutes;
    
    for (let i = 0; i < snapshots.length - windowSize; i++) {
      const startSnapshot = snapshots[i];
      const endSnapshot = snapshots[i + windowSize];
      
      // Find the strike with maximum gamma change
      for (const endStrike of endSnapshot.strikes) {
        const startStrike = startSnapshot.strikes.find(
          s => s.strike === endStrike.strike
        );
        
        if (startStrike) {
          const delta = endStrike.netGamma - startStrike.netGamma;
          
          if (delta > maxChange.delta) {
            maxChange.delta = delta;
            maxChange.strike = endStrike.strike;
            maxChange.timestamp = endSnapshot.timestamp;
          }
        }
      }
    }
    
    // Return null if no significant change found
    if (maxChange.delta === 0) return null;
    
    return maxChange;
  }
  
  /**
   * Detect max changes for all time windows
   */
  static detectAllMaxChanges(
    snapshots: GammaSnapshot[]
  ): Record<string, MaxChangeData | null> {
    const timeWindows: Array<'1m' | '5m' | '10m' | '15m' | '30m'> = ['1m', '5m', '10m', '15m', '30m'];
    
    const results: Record<string, MaxChangeData | null> = {};
    
    for (const window of timeWindows) {
      results[window] = this.detectMaxChange(snapshots, window);
    }
    
    return results;
  }
  
  /**
   * Get top N strikes with largest gamma changes
   */
  static getTopChangingStrikes(
    snapshots: GammaSnapshot[],
    timeWindow: '1m' | '5m' | '10m' | '15m' | '30m',
    topN: number = 5
  ): Array<{ strike: number; delta: number; timestamp: Date }> {
    if (snapshots.length < 2) return [];
    
    const windowMinutes = parseInt(timeWindow.replace('m', ''));
    const windowSize = windowMinutes;
    
    const strikeChanges = new Map<number, { delta: number; timestamp: Date }>();
    
    for (let i = 0; i < snapshots.length - windowSize; i++) {
      const startSnapshot = snapshots[i];
      const endSnapshot = snapshots[i + windowSize];
      
      for (const endStrike of endSnapshot.strikes) {
        const startStrike = startSnapshot.strikes.find(
          s => s.strike === endStrike.strike
        );
        
        if (startStrike) {
          const delta = endStrike.netGamma - startStrike.netGamma;
          const existing = strikeChanges.get(endStrike.strike);
          
          if (!existing || delta > existing.delta) {
            strikeChanges.set(endStrike.strike, {
              delta,
              timestamp: endSnapshot.timestamp,
            });
          }
        }
      }
    }
    
    // Convert to array and sort by delta
    const sorted = Array.from(strikeChanges.entries())
      .map(([strike, data]) => ({ strike, ...data }))
      .sort((a, b) => b.delta - a.delta);
    
    return sorted.slice(0, topN);
  }
  
  /**
   * Detect gamma flips (sign changes) for a strike
   */
  static detectGammaFlips(
    snapshots: GammaSnapshot[],
    strike: number
  ): Array<{ timestamp: Date; from: 'positive' | 'negative'; to: 'positive' | 'negative' }> {
    const flips: Array<{ timestamp: Date; from: 'positive' | 'negative'; to: 'positive' | 'negative' }> = [];
    
    for (let i = 0; i < snapshots.length - 1; i++) {
      const current = snapshots[i].strikes.find(s => s.strike === strike);
      const next = snapshots[i + 1].strikes.find(s => s.strike === strike);
      
      if (current && next) {
        const currentSign = current.netGamma >= 0 ? 'positive' : 'negative';
        const nextSign = next.netGamma >= 0 ? 'positive' : 'negative';
        
        if (currentSign !== nextSign) {
          flips.push({
            timestamp: snapshots[i + 1].timestamp,
            from: currentSign,
            to: nextSign,
          });
        }
      }
    }
    
    return flips;
  }
  
  /**
   * Calculate gamma velocity (rate of change)
   */
  static calculateGammaVelocity(
    snapshots: GammaSnapshot[],
    strike: number,
    windowMinutes: number = 5
  ): number | null {
    if (snapshots.length < windowMinutes + 1) return null;
    
    const recent = snapshots.slice(-windowMinutes - 1);
    const first = recent[0].strikes.find(s => s.strike === strike);
    const last = recent[recent.length - 1].strikes.find(s => s.strike === strike);
    
    if (!first || !last) return null;
    
    const delta = last.netGamma - first.netGamma;
    const timeDeltaMs = last.timestamp.getTime() - first.timestamp.getTime();
    const timeDeltaMinutes = timeDeltaMs / (1000 * 60);
    
    return delta / timeDeltaMinutes; // Gamma change per minute
  }
}
