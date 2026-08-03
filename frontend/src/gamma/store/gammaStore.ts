/**
 * Gamma state management using Zustand
 */

import { create } from 'zustand';
import type { 
  StrikeGammaData, 
  GammaSnapshot, 
  GammaLevel, 
  ExpirationMode,
  AlertEvent 
} from '../types/gammaTypes';

interface GammaState {
  // Current gamma data
  currentSnapshot: GammaSnapshot | null;
  strikes: StrikeGammaData[];
  
  // Key levels
  zeroGamma: number | null;
  callWall: number | null;
  putWall: number | null;
  majorPositiveGamma: number | null;
  majorNegativeGamma: number | null;
  
  // Expiration mode
  expirationMode: ExpirationMode;
  
  // Alerts
  alerts: AlertEvent[];
  
  // Loading state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentSnapshot: (snapshot: GammaSnapshot) => void;
  setStrikes: (strikes: StrikeGammaData[]) => void;
  setKeyLevels: (levels: {
    zeroGamma: number | null;
    callWall: number | null;
    putWall: number | null;
    majorPositiveGamma: number | null;
    majorNegativeGamma: number | null;
  }) => void;
  setExpirationMode: (mode: ExpirationMode) => void;
  addAlert: (alert: AlertEvent) => void;
  clearAlerts: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useGammaStore = create<GammaState>((set) => ({
  // Initial state
  currentSnapshot: null,
  strikes: [],
  zeroGamma: null,
  callWall: null,
  putWall: null,
  majorPositiveGamma: null,
  majorNegativeGamma: null,
  expirationMode: { type: 'latest' },
  alerts: [],
  isLoading: false,
  error: null,
  
  // Actions
  setCurrentSnapshot: (snapshot) => set({ currentSnapshot: snapshot }),
  
  setStrikes: (strikes) => set({ strikes }),
  
  setKeyLevels: (levels) => set({
    zeroGamma: levels.zeroGamma,
    callWall: levels.callWall,
    putWall: levels.putWall,
    majorPositiveGamma: levels.majorPositiveGamma,
    majorNegativeGamma: levels.majorNegativeGamma,
  }),
  
  setExpirationMode: (mode) => set({ expirationMode: mode }),
  
  addAlert: (alert) => set((state) => ({
    alerts: [...state.alerts, alert].slice(-20), // Keep last 20 alerts
  })),
  
  clearAlerts: () => set({ alerts: [] }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
}));
