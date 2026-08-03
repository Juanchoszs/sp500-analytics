/**
 * Mock data provider for fallback when real APIs fail
 * Provides realistic gamma data for development and emergency fallback
 */

import type { GammaSnapshot, PriceSnapshot, StrikeGammaData } from '../types/gammaTypes';

export class MockDataProvider {
  private static instance: MockDataProvider;
  
  private constructor() {}
  
  static getInstance(): MockDataProvider {
    if (!MockDataProvider.instance) {
      MockDataProvider.instance = new MockDataProvider();
    }
    return MockDataProvider.instance;
  }
  
  /**
   * Generate mock gamma snapshot
   */
  generateMockGammaSnapshot(ticker: string = 'SPY'): GammaSnapshot {
    const now = new Date();
    const spotPrice = ticker === 'SPY' ? 450 : 5400; // SPY ~450, SPX ~5400
    
    // Generate strikes around spot price
    const strikes: StrikeGammaData[] = [];
    const strikeRange = 20;
    const strikeStep = ticker === 'SPY' ? 2.5 : 50;
    
    for (let i = -strikeRange; i <= strikeRange; i++) {
      const strike = spotPrice + (i * strikeStep);
      const distanceFromSpot = Math.abs(strike - spotPrice);
      
      // Simulate realistic gamma distribution
      const baseGamma = Math.max(0, 100 - distanceFromSpot * 2);
      const callGamma = baseGamma * (1 - (strike > spotPrice ? 0.3 : 0));
      const putGamma = baseGamma * (strike > spotPrice ? 0.3 : 1);
      const netGamma = callGamma - putGamma;
      
      // Generate GEX (gamma * spot)
      const callGex = callGamma * strike * 100;
      const putGex = putGamma * strike * 100;
      const netGex = callGex - putGex;
      
      strikes.push({
        strike,
        callGamma,
        putGamma,
        netGamma,
        callGex,
        putGex,
        netGex,
        openInterestGamma: netGamma * 0.8,
        volumeGamma: netGamma * 0.5,
        timestamp: now,
      });
    }
    
    // Calculate key levels
    const callWall = spotPrice + (strikeStep * 8);
    const putWall = spotPrice - (strikeStep * 10);
    const zeroGamma = spotPrice + (strikeStep * 2);
    
    // Calculate total net GEX
    const totalNetGex = strikes.reduce((sum, s) => sum + s.netGex, 0);
    
    return {
      timestamp: now,
      strikes,
      spotPrice,
      totalNetGex,
      zeroGamma,
      callWall,
      putWall,
      majorPositiveGamma: callWall,
      majorNegativeGamma: putWall,
    };
  }
  
  /**
   * Generate mock price snapshot
   */
  generateMockPriceSnapshot(): PriceSnapshot {
    const now = new Date();
    const basePrice = 4500; // SPX-like price
    
    // Add some random variation
    const variation = (Math.random() - 0.5) * 10;
    const price = basePrice + variation;
    
    return {
      timestamp: now,
      open: price - 2,
      high: price + 3,
      low: price - 3,
      close: price,
      volume: 1000000 + Math.floor(Math.random() * 500000),
    };
  }
  
  /**
   * Generate mock minute candles
   */
  generateMockMinuteCandles(count: number = 390): PriceSnapshot[] {
    const candles: PriceSnapshot[] = [];
    const now = new Date();
    const basePrice = 4500;
    
    for (let i = count; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60000)); // 1 minute intervals
      const variation = (Math.random() - 0.5) * 20;
      const price = basePrice + variation;
      
      candles.push({
        timestamp,
        open: price - 1,
        high: price + 2,
        low: price - 2,
        close: price,
        volume: 1000000 + Math.floor(Math.random() * 500000),
      });
    }
    
    return candles;
  }
}