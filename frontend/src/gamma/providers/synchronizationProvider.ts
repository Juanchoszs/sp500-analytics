/**
 * Data synchronization provider for SPY options and ^GSPC price data
 */

import { YahooFinanceProvider } from './yahooFinanceProvider';
import { SpyOptionsProvider } from './spyOptionsProvider';
import { MockDataProvider } from './mockDataProvider';
import { synchronizeData, roundToMinute } from '../utils/timeSync';
import type { GammaSnapshot, PriceSnapshot } from '../types/gammaTypes';
import { SYNC_TOLERANCE_MS } from '../config/chartConfig';

export class SynchronizationProvider {
  private static instance: SynchronizationProvider;
  private yahooProvider: YahooFinanceProvider;
  private spyProvider: SpyOptionsProvider;
  private mockProvider: MockDataProvider;
  
  private constructor() {
    this.yahooProvider = YahooFinanceProvider.getInstance();
    this.spyProvider = SpyOptionsProvider.getInstance();
    this.mockProvider = MockDataProvider.getInstance();
  }
  
  static getInstance(): SynchronizationProvider {
    if (!SynchronizationProvider.instance) {
      SynchronizationProvider.instance = new SynchronizationProvider();
    }
    return SynchronizationProvider.instance;
  }
  
  /**
   * Fetch and synchronize current data with fallback to mock data
   */
  async fetchSynchronizedData(
    ticker: string = 'SPY',
    expiration?: string
  ): Promise<{
    gammaSnapshot: GammaSnapshot;
    priceSnapshot: PriceSnapshot | null;
    syncSuccess: boolean;
    usingFallback: boolean;
  }> {
    try {
      // Fetch both data sources in parallel
      const [gammaData, priceData] = await Promise.allSettled([
        this.spyProvider.fetchGammaData(ticker, expiration),
        this.yahooProvider.fetchCurrentPrice('^GSPC').then(price => ({
          timestamp: roundToMinute(new Date()),
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 0,
        })),
      ]);
      
      let gammaSnapshot = gammaData.status === 'fulfilled' ? gammaData.value : null;
      let priceSnapshot = priceData.status === 'fulfilled' ? priceData.value : null;
      let usingFallback = false;
      
      // If gamma data failed, use mock data
      if (!gammaSnapshot) {
        console.warn('[SynchronizationProvider] Gamma data fetch failed, using mock data');
        gammaSnapshot = this.mockProvider.generateMockGammaSnapshot(ticker);
        usingFallback = true;
      }
      
      // If price data failed, use mock data
      if (!priceSnapshot) {
        console.warn('[SynchronizationProvider] Price data fetch failed, using mock data');
        priceSnapshot = this.mockProvider.generateMockPriceSnapshot();
        usingFallback = true;
      }
      
      // Check synchronization
      let syncSuccess = false;
      if (priceSnapshot && gammaSnapshot) {
        syncSuccess = this.checkSync(
          gammaSnapshot.timestamp,
          priceSnapshot.timestamp
        );
      }
      
      return {
        gammaSnapshot,
        priceSnapshot,
        syncSuccess,
        usingFallback,
      };
    } catch (error) {
      console.error('[SynchronizationProvider] Error fetching synchronized data, using mock fallback:', error);
      
      // Complete fallback to mock data
      const gammaSnapshot = this.mockProvider.generateMockGammaSnapshot(ticker);
      const priceSnapshot = this.mockProvider.generateMockPriceSnapshot();
      
      return {
        gammaSnapshot,
        priceSnapshot,
        syncSuccess: false,
        usingFallback: true,
      };
    }
  }
  
  /**
   * Fetch historical synchronized data with fallback
   */
  async fetchHistoricalSynchronizedData(
    ticker: string = 'SPY',
    expiration?: string,
    minutes: number = 30
  ): Promise<{
    gammaSnapshots: GammaSnapshot[];
    priceSnapshots: PriceSnapshot[];
    synchronized: Array<{
      timestamp: Date;
      gamma: GammaSnapshot;
      price: PriceSnapshot | null;
    }>;
    usingFallback: boolean;
  }> {
    try {
      // Fetch historical price data
      const priceSnapshots = await this.yahooProvider.fetchMinuteCandles(
        '^GSPC',
        '1m',
        '1d'
      );
      
      // Get recent price snapshots
      const recentPriceSnapshots = priceSnapshots.slice(-minutes);
      
      // For gamma data, we'll need to simulate historical snapshots
      // In production, this would come from a historical data API
      const gammaSnapshots: GammaSnapshot[] = [];
      
      for (let i = 0; i < Math.min(minutes, recentPriceSnapshots.length); i++) {
        const priceSnapshot = recentPriceSnapshots[i];
        
        try {
          const gammaData = await this.spyProvider.fetchGammaData(ticker, expiration);
          gammaSnapshots.push({
            ...gammaData,
            timestamp: priceSnapshot.timestamp,
          });
        } catch (error) {
          console.error(`Error fetching gamma for ${priceSnapshot.timestamp}:`, error);
          // Use mock data for failed gamma fetches
          gammaSnapshots.push(this.mockProvider.generateMockGammaSnapshot(ticker));
        }
      }
      
      // Synchronize the data
      const synchronized = synchronizeData(
        gammaSnapshots.map(s => ({ timestamp: s.timestamp, data: s })),
        recentPriceSnapshots.map(p => ({ timestamp: p.timestamp, data: p })),
        SYNC_TOLERANCE_MS
      );
      
      return {
        gammaSnapshots,
        priceSnapshots: recentPriceSnapshots,
        synchronized: synchronized.map(s => ({
          timestamp: s.timestamp,
          gamma: s.primary,
          price: s.secondary,
        })),
        usingFallback: false,
      };
    } catch (error) {
      console.error('[SynchronizationProvider] Error fetching historical data, using mock fallback:', error);
      
      // Complete fallback to mock data
      const priceSnapshots = this.mockProvider.generateMockMinuteCandles(minutes);
      const gammaSnapshots = priceSnapshots.map(() => this.mockProvider.generateMockGammaSnapshot(ticker));
      
      const synchronized = synchronizeData(
        gammaSnapshots.map(s => ({ timestamp: s.timestamp, data: s })),
        priceSnapshots.map(p => ({ timestamp: p.timestamp, data: p })),
        SYNC_TOLERANCE_MS
      );
      
      return {
        gammaSnapshots,
        priceSnapshots,
        synchronized: synchronized.map(s => ({
          timestamp: s.timestamp,
          gamma: s.primary,
          price: s.secondary,
        })),
        usingFallback: true,
      };
    }
  }
  
  /**
   * Check if two timestamps are synchronized within tolerance
   */
  private checkSync(timestamp1: Date, timestamp2: Date): boolean {
    const diff = Math.abs(timestamp1.getTime() - timestamp2.getTime());
    return diff <= SYNC_TOLERANCE_MS;
  }
  
  /**
   * Start real-time synchronization with error handling
   */
  startRealTimeSync(
    ticker: string = 'SPY',
    expiration: string | undefined,
    intervalMs: number = 5000,
    callback: (data: {
      gammaSnapshot: GammaSnapshot;
      priceSnapshot: PriceSnapshot | null;
      syncSuccess: boolean;
      usingFallback: boolean;
    }) => void
  ): () => void {
    const intervalId = setInterval(async () => {
      try {
        const data = await this.fetchSynchronizedData(ticker, expiration);
        callback(data);
      } catch (error) {
        console.error('[SynchronizationProvider] Error in real-time sync:', error);
        // Don't fail completely, just log and continue
      }
    }, intervalMs);
    
    // Return cleanup function
    return () => clearInterval(intervalId);
  }
}
