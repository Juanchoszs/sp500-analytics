/**
 * Hook for max change detection in gamma exposure
 */

import { useState, useEffect, useCallback } from 'react';
import { MaxChangeDetector } from '../history/maxChangeDetector';
import SnapshotStore from '../history/snapshotStore';
import type { MaxChangeData, GammaSnapshot } from '../types/gammaTypes';

export function useMaxChangeDetection() {
  const [maxChanges, setMaxChanges] = useState<Record<string, MaxChangeData | null>>({});
  const [topChangingStrikes, setTopChangingStrikes] = useState<Array<{
    strike: number;
    delta: number;
    timestamp: Date;
  }>>([]);
  const [loading, setLoading] = useState(false);
  
  const snapshotStore = SnapshotStore.getInstance();
  
  const detectMaxChanges = useCallback(async (timeWindow?: '1m' | '5m' | '10m' | '15m' | '30m') => {
    setLoading(true);
    
    try {
      const gammaSnapshots = snapshotStore.getGammaSnapshots();
      
      if (timeWindow) {
        // Detect for specific time window
        const change = MaxChangeDetector.detectMaxChange(gammaSnapshots, timeWindow);
        setMaxChanges(prev => ({ ...prev, [timeWindow]: change }));
      } else {
        // Detect for all time windows
        const changes = MaxChangeDetector.detectAllMaxChanges(gammaSnapshots);
        setMaxChanges(changes);
      }
    } catch (error) {
      console.error('Error detecting max changes:', error);
    } finally {
      setLoading(false);
    }
  }, [snapshotStore]);
  
  const detectTopChangingStrikes = useCallback(
    (
      timeWindow: '1m' | '5m' | '10m' | '15m' | '30m',
      topN: number = 5
    ) => {
      const gammaSnapshots = snapshotStore.getGammaSnapshots();
      const topStrikes = MaxChangeDetector.getTopChangingStrikes(
        gammaSnapshots,
        timeWindow,
        topN
      );
      setTopChangingStrikes(topStrikes);
    },
    [snapshotStore]
  );
  
  const detectGammaFlips = useCallback((strike: number) => {
    const gammaSnapshots = snapshotStore.getGammaSnapshots();
    return MaxChangeDetector.detectGammaFlips(gammaSnapshots, strike);
  }, [snapshotStore]);
  
  const calculateGammaVelocity = useCallback(
    (strike: number, windowMinutes: number = 5) => {
      const gammaSnapshots = snapshotStore.getGammaSnapshots();
      return MaxChangeDetector.calculateGammaVelocity(
        gammaSnapshots,
        strike,
        windowMinutes
      );
    },
    [snapshotStore]
  );
  
  // Auto-detect max changes when snapshots change
  useEffect(() => {
    const stats = snapshotStore.getStats();
    if (stats.gammaSnapshots > 10) {
      detectMaxChanges();
    }
  }, [snapshotStore, detectMaxChanges]);
  
  return {
    maxChanges,
    topChangingStrikes,
    loading,
    detectMaxChanges,
    detectTopChangingStrikes,
    detectGammaFlips,
    calculateGammaVelocity,
  };
}
