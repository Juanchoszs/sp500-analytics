/**
 * SPY Options data provider with enhanced gamma calculations
 */

import type { StrikeGammaData, GammaSnapshot } from '../types/gammaTypes';
import { marketApi } from '../../api/client';
import type { ExposureResponse, StrikeExposureOut } from '../../types';

export class SpyOptionsProvider {
  private static instance: SpyOptionsProvider;
  
  private constructor() {}
  
  static getInstance(): SpyOptionsProvider {
    if (!SpyOptionsProvider.instance) {
      SpyOptionsProvider.instance = new SpyOptionsProvider();
    }
    return SpyOptionsProvider.instance;
  }
  
  /**
   * Fetch SPY options data with enhanced gamma calculations
   */
  async fetchGammaData(
    ticker: string = 'SPY',
    expiration?: string
  ): Promise<GammaSnapshot> {
    try {
      const params = { ticker, expiration };
      const exposure: ExposureResponse = await marketApi.getExposure(params);
      
      // Convert existing strike data to enhanced format
      const strikes: StrikeGammaData[] = (exposure.strikes || []).map(
        (strike: StrikeExposureOut) => this.convertToGammaData(strike)
      );
      
      // Calculate additional gamma metrics
      const enhancedStrikes = this.calculateGammaMetrics(strikes);
      
      // Find key levels
      const zeroGamma = this.findZeroGamma(enhancedStrikes, exposure.spot_price);
      const callWall = exposure.call_wall;
      const putWall = exposure.put_wall;
      const majorPositiveGamma = this.findMajorGamma(enhancedStrikes, 'positive');
      const majorNegativeGamma = this.findMajorGamma(enhancedStrikes, 'negative');
      
      return {
        timestamp: new Date(),
        strikes: enhancedStrikes,
        spotPrice: exposure.spot_price,
        indexPrice: exposure.index_price || undefined,
        totalNetGex: exposure.net_gamma_exposure,
        zeroGamma,
        callWall,
        putWall,
        majorPositiveGamma,
        majorNegativeGamma,
      };
    } catch (error) {
      console.error('Error fetching SPY options data:', error);
      throw error;
    }
  }
  
  /**
   * Convert existing StrikeExposureOut to StrikeGammaData
   */
  private convertToGammaData(strike: StrikeExposureOut): StrikeGammaData {
    return {
      strike: strike.strike,
      callGamma: strike.call_gamma_exposure || 0,
      putGamma: strike.put_gamma_exposure || 0,
      netGamma: strike.gamma_exposure,
      callGex: strike.call_gamma_exposure || 0,
      putGex: strike.put_gamma_exposure || 0,
      netGex: strike.gamma_exposure,
      openInterestGamma: this.calculateOiGamma(strike),
      volumeGamma: this.calculateVolumeGamma(strike),
      timestamp: new Date(),
    };
  }
  
  /**
   * Calculate Open Interest Gamma
   */
  private calculateOiGamma(strike: StrikeExposureOut): number {
    // Simplified calculation - would need actual gamma values from Greeks
    const totalOi = strike.call_oi + strike.put_oi;
    return totalOi * 0.1; // Placeholder - needs actual gamma calculation
  }
  
  /**
   * Calculate Volume Gamma
   */
  private calculateVolumeGamma(strike: StrikeExposureOut): number {
    // Simplified calculation - would need actual gamma values from Greeks
    const totalVolume = strike.call_volume + strike.put_volume;
    return totalVolume * 0.05; // Placeholder - needs actual gamma calculation
  }
  
  /**
   * Calculate additional gamma metrics for all strikes
   */
  private calculateGammaMetrics(strikes: StrikeGammaData[]): StrikeGammaData[] {
    return strikes.map(strike => ({
      ...strike,
      // Ensure Net GEX = Call GEX - Put GEX
      netGex: strike.callGex - strike.putGex,
    }));
  }
  
  /**
   * Find Zero Gamma level
   */
  private findZeroGamma(strikes: StrikeGammaData[], spotPrice: number): number | null {
    // Find strike where net gamma crosses zero
    for (let i = 0; i < strikes.length - 1; i++) {
      const current = strikes[i];
      const next = strikes[i + 1];
      
      if (
        (current.netGamma <= 0 && next.netGamma >= 0) ||
        (current.netGamma >= 0 && next.netGamma <= 0)
      ) {
        // Linear interpolation
        const ratio = Math.abs(current.netGamma) / (Math.abs(current.netGamma) + Math.abs(next.netGamma));
        return current.strike + ratio * (next.strike - current.strike);
      }
    }
    
    return null;
  }
  
  /**
   * Find major gamma level (positive or negative)
   */
  private findMajorGamma(strikes: StrikeGammaData[], type: 'positive' | 'negative'): number | null {
    const filtered = strikes.filter(s =>
      type === 'positive' ? s.netGamma > 0 : s.netGamma < 0
    );
    
    if (filtered.length === 0) return null;
    
    // Find strike with maximum absolute gamma
    const maxStrike = filtered.reduce((max, current) =>
      Math.abs(current.netGamma) > Math.abs(max.netGamma) ? current : max
    );
    
    return maxStrike.strike;
  }
  
  /**
   * Fetch 90-day aggregate gamma data
   */
  async fetch90DayAggregate(ticker: string = 'SPY'): Promise<GammaSnapshot> {
    try {
      // Fetch all expirations within 90 days
      const expirations = await marketApi.getExpirations({ ticker });
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
      
      const validExpirations = expirations.expirations
        .map(exp => new Date(exp))
        .filter(exp => exp <= ninetyDaysFromNow);
      
      // Aggregate gamma from all expirations
      let aggregatedStrikes: Map<number, StrikeGammaData> = new Map();
      let totalNetGex = 0;
      let spotPrice = 0;
      
      for (const exp of validExpirations) {
        const expStr = exp.toISOString().split('T')[0];
        const snapshot = await this.fetchGammaData(ticker, expStr);
        
        spotPrice = snapshot.spotPrice;
        totalNetGex += snapshot.totalNetGex;
        
        for (const strike of snapshot.strikes) {
          const existing = aggregatedStrikes.get(strike.strike);
          if (existing) {
            aggregatedStrikes.set(strike.strike, {
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
            aggregatedStrikes.set(strike.strike, { ...strike });
          }
        }
      }
      
      const strikes = Array.from(aggregatedStrikes.values()).sort((a, b) => a.strike - b.strike);
      
      return {
        timestamp: new Date(),
        strikes,
        spotPrice,
        totalNetGex,
        zeroGamma: this.findZeroGamma(strikes, spotPrice),
        callWall: this.findMajorGamma(strikes, 'positive'),
        putWall: this.findMajorGamma(strikes, 'negative'),
        majorPositiveGamma: this.findMajorGamma(strikes, 'positive'),
        majorNegativeGamma: this.findMajorGamma(strikes, 'negative'),
      };
    } catch (error) {
      console.error('Error fetching 90-day aggregate:', error);
      throw error;
    }
  }
}
