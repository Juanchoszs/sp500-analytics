/**
 * Replay engine for historical gamma data playback
 */

import type { GammaSnapshot, PriceSnapshot, ReplayState } from '../types/gammaTypes';
import { HISTORICAL_INTERVALS, PLAYBACK_SPEEDS } from '../config/chartConfig';

export class ReplayEngine {
  private gammaSnapshots: GammaSnapshot[] = [];
  private priceSnapshots: PriceSnapshot[] = [];
  private currentIndex: number = 0;
  private isPlaying: boolean = false;
  private playbackSpeed: number = 1;
  private playbackInterval: number | null = null;
  private onTickCallback: ((data: {
    gamma: GammaSnapshot;
    price: PriceSnapshot | null;
    index: number;
  }) => void) | null = null;
  
  /**
   * Load historical data for replay
   */
  loadData(gammaSnapshots: GammaSnapshot[], priceSnapshots: PriceSnapshot[]): void {
    this.gammaSnapshots = gammaSnapshots;
    this.priceSnapshots = priceSnapshots;
    this.currentIndex = 0;
    this.stop();
  }
  
  /**
   * Start playback
   */
  play(): void {
    if (this.isPlaying) return;
    if (this.currentIndex >= this.gammaSnapshots.length) {
      this.currentIndex = 0; // Restart from beginning
    }
    
    this.isPlaying = true;
    this.scheduleNextTick();
  }
  
  /**
   * Pause playback
   */
  pause(): void {
    this.isPlaying = false;
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }
  
  /**
   * Stop playback and reset to beginning
   */
  stop(): void {
    this.pause();
    this.currentIndex = 0;
  }
  
  /**
   * Jump to specific index
   */
  jumpToIndex(index: number): void {
    if (index < 0 || index >= this.gammaSnapshots.length) return;
    
    this.currentIndex = index;
    this.emitCurrentData();
  }
  
  /**
   * Jump to specific timestamp
   */
  jumpToTimestamp(timestamp: Date): void {
    const index = this.gammaSnapshots.findIndex(
      s => s.timestamp.getTime() === timestamp.getTime()
    );
    
    if (index !== -1) {
      this.jumpToIndex(index);
    }
  }
  
  /**
   * Step forward one frame
   */
  stepForward(): void {
    if (this.currentIndex < this.gammaSnapshots.length - 1) {
      this.currentIndex++;
      this.emitCurrentData();
    }
  }
  
  /**
   * Step backward one frame
   */
  stepBackward(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.emitCurrentData();
    }
  }
  
  /**
   * Set playback speed
   */
  setPlaybackSpeed(speed: number): void {
    if (!PLAYBACK_SPEEDS.includes(speed as any)) return;
    
    this.playbackSpeed = speed;
    
    // Restart playback with new speed if currently playing
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  }
  
  /**
   * Get current replay state
   */
  getState(): ReplayState {
    return {
      isPlaying: this.isPlaying,
      currentTime: this.gammaSnapshots[this.currentIndex]?.timestamp || new Date(),
      playbackSpeed: this.playbackSpeed,
      selectedInterval: 5, // Default interval
    };
  }
  
  /**
   * Register callback for each tick
   */
  onTick(callback: (data: {
    gamma: GammaSnapshot;
    price: PriceSnapshot | null;
    index: number;
  }) => void): void {
    this.onTickCallback = callback;
  }
  
  /**
   * Get current data
   */
  getCurrentData(): {
    gamma: GammaSnapshot;
    price: PriceSnapshot | null;
    index: number;
  } | null {
    if (this.currentIndex >= this.gammaSnapshots.length) return null;
    
    const gamma = this.gammaSnapshots[this.currentIndex];
    const price = this.priceSnapshots[this.currentIndex] || null;
    
    return {
      gamma,
      price,
      index: this.currentIndex,
    };
  }
  
  /**
   * Get total number of frames
   */
  getTotalFrames(): number {
    return this.gammaSnapshots.length;
  }
  
  /**
   * Get current frame index
   */
  getCurrentFrame(): number {
    return this.currentIndex;
  }
  
  /**
   * Get progress percentage
   */
  getProgress(): number {
    if (this.gammaSnapshots.length === 0) return 0;
    return (this.currentIndex / (this.gammaSnapshots.length - 1)) * 100;
  }
  
  /**
   * Schedule next playback tick
   */
  private scheduleNextTick(): void {
    const intervalMs = 1000 / this.playbackSpeed; // Base 1 second, adjusted by speed
    
    this.playbackInterval = window.setInterval(() => {
      if (!this.isPlaying) {
        this.pause();
        return;
      }
      
      if (this.currentIndex < this.gammaSnapshots.length - 1) {
        this.currentIndex++;
        this.emitCurrentData();
      } else {
        this.pause(); // End of playback
      }
    }, intervalMs);
  }
  
  /**
   * Emit current data to callback
   */
  private emitCurrentData(): void {
    if (!this.onTickCallback) return;
    
    const data = this.getCurrentData();
    if (data) {
      this.onTickCallback(data);
    }
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.onTickCallback = null;
    this.gammaSnapshots = [];
    this.priceSnapshots = [];
  }
}

export default ReplayEngine;
