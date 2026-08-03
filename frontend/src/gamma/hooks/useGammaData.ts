/**
 * Hook for fetching and managing gamma data
 */

import { useState, useEffect, useCallback } from 'react';
import { SynchronizationProvider } from '../providers/synchronizationProvider';
import SnapshotStore from '../history/snapshotStore';
import type { GammaSnapshot, PriceSnapshot } from '../types/gammaTypes';

export function useGammaData(ticker: string = 'SPY', expiration?: string) {
  const [currentSnapshot, setCurrentSnapshot] = useState<GammaSnapshot | null>(null);
  const [currentPrice, setCurrentPrice] = useState<PriceSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  
  const syncProvider = SynchronizationProvider.getInstance();
  const snapshotStore = SnapshotStore.getInstance();
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await syncProvider.fetchSynchronizedData(ticker, expiration);
      
      setCurrentSnapshot(data.gammaSnapshot);
      setCurrentPrice(data.priceSnapshot);
      setSyncSuccess(data.syncSuccess);
      setUsingFallback(data.usingFallback);
      
      // Store snapshot for historical purposes
      snapshotStore.addGammaSnapshot(data.gammaSnapshot);
      if (data.priceSnapshot) {
        snapshotStore.addPriceSnapshot(data.priceSnapshot);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch gamma data');
      console.error('Error fetching gamma data:', err);
    } finally {
      setLoading(false);
    }
  }, [ticker, expiration, syncProvider, snapshotStore]);
  
  const startRealTimeUpdates = useCallback((intervalMs: number = 5000) => {
    return syncProvider.startRealTimeSync(ticker, expiration, intervalMs, (data) => {
      setCurrentSnapshot(data.gammaSnapshot);
      setCurrentPrice(data.priceSnapshot);
      setSyncSuccess(data.syncSuccess);
      setUsingFallback(data.usingFallback);
      
      snapshotStore.addGammaSnapshot(data.gammaSnapshot);
      if (data.priceSnapshot) {
        snapshotStore.addPriceSnapshot(data.priceSnapshot);
      }
    });
  }, [ticker, expiration, syncProvider, snapshotStore]);
  
  const getHistoricalData = useCallback((minutes: number = 30) => {
    return {
      gammaSnapshots: snapshotStore.getRecentGammaSnapshots(minutes),
      priceSnapshots: snapshotStore.getPriceSnapshots().slice(-minutes),
    };
  }, [snapshotStore]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return {
    currentSnapshot,
    currentPrice,
    loading,
    error,
    syncSuccess,
    usingFallback,
    fetchData,
    startRealTimeUpdates,
    getHistoricalData,
  };
}
