/**
 * Alert engine for detecting gamma level crossings
 */

import type { AlertConfig, AlertEvent, GammaSnapshot } from '../types/gammaTypes';
import { DEFAULT_ALERT_CONFIG } from '../config/chartConfig';

export class AlertEngine {
  private config: AlertConfig;
  private lastAlertTimes: Map<string, number> = new Map();
  private alertCallbacks: Set<(event: AlertEvent) => void> = new Set();
  
  constructor(config: Partial<AlertConfig> = {}) {
    this.config = { ...DEFAULT_ALERT_CONFIG, ...config };
  }
  
  /**
   * Update alert configuration
   */
  updateConfig(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Register callback for alerts
   */
  onAlert(callback: (event: AlertEvent) => void): () => void {
    this.alertCallbacks.add(callback);
    
    // Return cleanup function
    return () => {
      this.alertCallbacks.delete(callback);
    };
  }
  
  /**
   * Process a new gamma snapshot and check for alerts
   */
  processSnapshot(snapshot: GammaSnapshot, previousSnapshot: GammaSnapshot | null): void {
    if (!previousSnapshot) return;
    
    const spotPrice = snapshot.spotPrice;
    const previousSpot = previousSnapshot.spotPrice;
    
    // Check for Major Positive Gamma crossing
    if (this.config.majorPositiveCrossing && snapshot.majorPositiveGamma) {
      this.checkLevelCrossing(
        'major_positive',
        snapshot.majorPositiveGamma,
        previousSnapshot.majorPositiveGamma,
        spotPrice,
        previousSpot,
        snapshot.timestamp
      );
    }
    
    // Check for Major Negative Gamma crossing
    if (this.config.majorNegativeCrossing && snapshot.majorNegativeGamma) {
      this.checkLevelCrossing(
        'major_negative',
        snapshot.majorNegativeGamma,
        previousSnapshot.majorNegativeGamma,
        spotPrice,
        previousSpot,
        snapshot.timestamp
      );
    }
    
    // Check for Zero Gamma crossing
    if (this.config.zeroGammaCrossing && snapshot.zeroGamma) {
      this.checkLevelCrossing(
        'zero_gamma',
        snapshot.zeroGamma,
        previousSnapshot.zeroGamma,
        spotPrice,
        previousSpot,
        snapshot.timestamp
      );
    }
  }
  
  /**
   * Check if spot price crossed a level
   */
  private checkLevelCrossing(
    type: 'major_positive' | 'major_negative' | 'zero_gamma',
    currentLevel: number,
    previousLevel: number | null,
    currentSpot: number,
    previousSpot: number,
    timestamp: Date
  ): void {
    if (!previousLevel) return;
    
    const alertKey = `${type}_${currentLevel}`;
    const now = Date.now();
    const lastAlert = this.lastAlertTimes.get(alertKey) || 0;
    
    // Check cooldown
    if (now - lastAlert < this.config.cooldownMs) {
      return;
    }
    
    // Check for crossing
    const crossedUp = previousSpot < currentLevel && currentSpot >= currentLevel;
    const crossedDown = previousSpot > currentLevel && currentSpot <= currentLevel;
    
    if (crossedUp || crossedDown) {
      const event: AlertEvent = {
        type,
        strike: currentLevel,
        timestamp,
        direction: crossedUp ? 'crossed_up' : 'crossed_down',
      };
      
      this.triggerAlert(event);
      this.lastAlertTimes.set(alertKey, now);
    }
  }
  
  /**
   * Trigger alert to all registered callbacks
   */
  private triggerAlert(event: AlertEvent): void {
    for (const callback of this.alertCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    }
  }
  
  /**
   * Clear alert history
   */
  clearHistory(): void {
    this.lastAlertTimes.clear();
  }
  
  /**
   * Get current configuration
   */
  getConfig(): AlertConfig {
    return { ...this.config };
  }
  
  /**
   * Check if alerts are enabled for a specific type
   */
  isAlertEnabled(type: 'major_positive' | 'major_negative' | 'zero_gamma'): boolean {
    switch (type) {
      case 'major_positive':
        return this.config.majorPositiveCrossing;
      case 'major_negative':
        return this.config.majorNegativeCrossing;
      case 'zero_gamma':
        return this.config.zeroGammaCrossing;
    }
  }
  
  /**
   * Enable/disable specific alert type
   */
  setAlertEnabled(
    type: 'major_positive' | 'major_negative' | 'zero_gamma',
    enabled: boolean
  ): void {
    switch (type) {
      case 'major_positive':
        this.config.majorPositiveCrossing = enabled;
        break;
      case 'major_negative':
        this.config.majorNegativeCrossing = enabled;
        break;
      case 'zero_gamma':
        this.config.zeroGammaCrossing = enabled;
        break;
    }
  }
  
  /**
   * Set alert cooldown period
   */
  setCooldown(cooldownMs: number): void {
    this.config.cooldownMs = cooldownMs;
  }
}
