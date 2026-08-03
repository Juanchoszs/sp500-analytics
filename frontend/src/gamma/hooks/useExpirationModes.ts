/**
 * Hook for managing expiration modes (Latest, Next, 90-Day Aggregate)
 */

import { useState, useCallback } from 'react';
import { SpyOptionsProvider } from '../providers/spyOptionsProvider';
import { marketApi } from '../../api/client';
import type { ExpirationMode, GammaSnapshot } from '../types/gammaTypes';
import { EXPIRATION_MODES } from '../config/chartConfig';

export function useExpirationModes(ticker: string = 'SPY') {
  const [currentMode, setCurrentMode] = useState<ExpirationMode>({ type: 'latest' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<GammaSnapshot | null>(null);
  
  const spyProvider = SpyOptionsProvider.getInstance();
  
  const fetchModeData = useCallback(async (mode: ExpirationMode) => {
    setLoading(true);
    setError(null);
    
    try {
      let result: GammaSnapshot;
      
      switch (mode.type) {
        case 'latest':
          // Fetch with no expiration (gets nearest)
          result = await spyProvider.fetchGammaData(ticker, undefined);
          break;
          
        case 'next':
          // Fetch next expiration after current
          const expirations = await marketApi.getExpirations({ ticker });
          
          const sortedExpirations = expirations.expirations
            .map(d => new Date(d))
            .filter(d => d > new Date())
            .sort((a, b) => a.getTime() - b.getTime());
          
          if (sortedExpirations.length === 0) {
            throw new Error('No future expirations available');
          }
          
          const nextExpiration = sortedExpirations[0].toISOString().split('T')[0];
          result = await spyProvider.fetchGammaData(ticker, nextExpiration);
          break;
          
        case 'aggregate_90d':
          // Fetch 90-day aggregate
          result = await spyProvider.fetch90DayAggregate(ticker);
          break;
          
        default:
          throw new Error(`Unknown expiration mode: ${mode.type}`);
      }
      
      setSnapshot(result);
      setCurrentMode(mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch gamma data');
      console.error('Error fetching expiration mode data:', err);
    } finally {
      setLoading(false);
    }
  }, [ticker, spyProvider]);
  
  const switchMode = useCallback((modeType: ExpirationMode['type'], value?: string) => {
    const newMode: ExpirationMode = { type: modeType, value };
    fetchModeData(newMode);
  }, [fetchModeData]);
  
  const refreshCurrentMode = useCallback(() => {
    fetchModeData(currentMode);
  }, [currentMode, fetchModeData]);
  
  return {
    currentMode,
    snapshot,
    loading,
    error,
    switchMode,
    refreshCurrentMode,
    availableModes: EXPIRATION_MODES,
  };
}
