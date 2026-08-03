/**
 * Historical snapshot storage and management
 */

import type { GammaSnapshot, PriceSnapshot, OIVolumeSnapshot, HistoricalData } from '../types/gammaTypes';

class SnapshotStore {
  private static instance: SnapshotStore;
  private gammaSnapshots: GammaSnapshot[] = [];
  private priceSnapshots: PriceSnapshot[] = [];
  private oiVolumeSnapshots: OIVolumeSnapshot[] = [];
  private maxSnapshots: number = 1000; // Store up to 1000 snapshots
  
  private constructor() {}
  
  static getInstance(): SnapshotStore {
    if (!SnapshotStore.instance) {
      SnapshotStore.instance = new SnapshotStore();
    }
    return SnapshotStore.instance;
  }
  
  /**
   * Add a gamma snapshot
   */
  addGammaSnapshot(snapshot: GammaSnapshot): void {
    this.gammaSnapshots.push(snapshot);
    this.enforceLimit();
  }
  
  /**
   * Add a price snapshot
   */
  addPriceSnapshot(snapshot: PriceSnapshot): void {
    this.priceSnapshots.push(snapshot);
    this.enforceLimit();
  }
  
  /**
   * Add an OI/Volume snapshot
   */
  addOiVolumeSnapshot(snapshot: OIVolumeSnapshot): void {
    this.oiVolumeSnapshots.push(snapshot);
    this.enforceLimit();
  }
  
  /**
   * Get all gamma snapshots
   */
  getGammaSnapshots(): GammaSnapshot[] {
    return [...this.gammaSnapshots];
  }
  
  /**
   * Get all price snapshots
   */
  getPriceSnapshots(): PriceSnapshot[] {
    return [...this.priceSnapshots];
  }
  
  /**
   * Get all OI/Volume snapshots
   */
  getOiVolumeSnapshots(): OIVolumeSnapshot[] {
    return [...this.oiVolumeSnapshots];
  }
  
  /**
   * Get complete historical data
   */
  getHistoricalData(): HistoricalData {
    return {
      gammaSnapshots: this.getGammaSnapshots(),
      priceSnapshots: this.getPriceSnapshots(),
      oiVolumeSnapshots: this.getOiVolumeSnapshots(),
    };
  }
  
  /**
   * Get gamma snapshots within time range
   */
  getGammaSnapshotsInRange(startDate: Date, endDate: Date): GammaSnapshot[] {
    return this.gammaSnapshots.filter(
      s => s.timestamp >= startDate && s.timestamp <= endDate
    );
  }
  
  /**
   * Get recent gamma snapshots (last N minutes)
   */
  getRecentGammaSnapshots(minutes: number): GammaSnapshot[] {
    const cutoffDate = new Date();
    cutoffDate.setMinutes(cutoffDate.getMinutes() - minutes);
    
    return this.gammaSnapshots.filter(s => s.timestamp >= cutoffDate);
  }
  
  /**
   * Get gamma snapshot at specific timestamp
   */
  getGammaSnapshotAt(timestamp: Date): GammaSnapshot | null {
    return this.gammaSnapshots.find(
      s => s.timestamp.getTime() === timestamp.getTime()
    ) || null;
  }
  
  /**
   * Get price snapshot at specific timestamp
   */
  getPriceSnapshotAt(timestamp: Date): PriceSnapshot | null {
    return this.priceSnapshots.find(
      s => s.timestamp.getTime() === timestamp.getTime()
    ) || null;
  }
  
  /**
   * Clear all snapshots
   */
  clearAll(): void {
    this.gammaSnapshots = [];
    this.priceSnapshots = [];
    this.oiVolumeSnapshots = [];
  }
  
  /**
   * Clear snapshots older than specified date
   */
  clearBefore(date: Date): void {
    this.gammaSnapshots = this.gammaSnapshots.filter(s => s.timestamp >= date);
    this.priceSnapshots = this.priceSnapshots.filter(s => s.timestamp >= date);
    this.oiVolumeSnapshots = this.oiVolumeSnapshots.filter(s => s.timestamp >= date);
  }
  
  /**
   * Enforce maximum snapshot limit
   */
  private enforceLimit(): void {
    if (this.gammaSnapshots.length > this.maxSnapshots) {
      this.gammaSnapshots = this.gammaSnapshots.slice(-this.maxSnapshots);
    }
    if (this.priceSnapshots.length > this.maxSnapshots) {
      this.priceSnapshots = this.priceSnapshots.slice(-this.maxSnapshots);
    }
    if (this.oiVolumeSnapshots.length > this.maxSnapshots) {
      this.oiVolumeSnapshots = this.oiVolumeSnapshots.slice(-this.maxSnapshots);
    }
  }
  
  /**
   * Set maximum snapshot limit
   */
  setMaxSnapshots(limit: number): void {
    this.maxSnapshots = limit;
    this.enforceLimit();
  }
  
  /**
   * Get storage statistics
   */
  getStats(): {
    gammaSnapshots: number;
    priceSnapshots: number;
    oiVolumeSnapshots: number;
    maxSnapshots: number;
  } {
    return {
      gammaSnapshots: this.gammaSnapshots.length,
      priceSnapshots: this.priceSnapshots.length,
      oiVolumeSnapshots: this.oiVolumeSnapshots.length,
      maxSnapshots: this.maxSnapshots,
    };
  }
}

export default SnapshotStore;
