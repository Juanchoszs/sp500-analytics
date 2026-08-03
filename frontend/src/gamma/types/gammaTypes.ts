/**
 * Gamma-specific type definitions for Gexbot-style implementation
 */

export interface StrikeGammaData {
  strike: number;
  callGamma: number;
  putGamma: number;
  netGamma: number;
  callGex: number;
  putGex: number;
  netGex: number;
  openInterestGamma: number;
  volumeGamma: number;
  timestamp: Date;
}

export interface GammaSnapshot {
  timestamp: Date;
  strikes: StrikeGammaData[];
  spotPrice: number;
  indexPrice?: number;
  totalNetGex: number;
  zeroGamma: number | null;
  callWall: number | null;
  putWall: number | null;
  majorPositiveGamma: number | null;
  majorNegativeGamma: number | null;
}

export interface PriceSnapshot {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OIVolumeSnapshot {
  timestamp: Date;
  strikes: Record<number, {
    callOi: number;
    putOi: number;
    callVolume: number;
    putVolume: number;
  }>;
}

export interface HistoricalData {
  gammaSnapshots: GammaSnapshot[];
  priceSnapshots: PriceSnapshot[];
  oiVolumeSnapshots: OIVolumeSnapshot[];
}

export interface MaxChangeData {
  timeWindow: '1m' | '5m' | '10m' | '15m' | '30m';
  strike: number;
  delta: number;
  timestamp: Date;
}

export interface GammaLevel {
  level: number;
  type: 'zero_gamma' | 'call_wall' | 'put_wall' | 'major_positive' | 'major_negative';
  strength: number;
}

export interface ExpirationMode {
  type: 'latest' | 'next' | 'aggregate_90d';
  value?: string;
}

export interface ReplayState {
  isPlaying: boolean;
  currentTime: Date;
  playbackSpeed: number;
  selectedInterval: number;
}

export interface AlertConfig {
  majorPositiveCrossing: boolean;
  majorNegativeCrossing: boolean;
  zeroGammaCrossing: boolean;
  cooldownMs: number;
}

export interface AlertEvent {
  type: 'major_positive' | 'major_negative' | 'zero_gamma';
  strike: number;
  timestamp: Date;
  direction: 'crossed_up' | 'crossed_down';
}

export interface ChartConfig {
  colors: {
    positive: string;
    negative: string;
    dots: string;
    spot: string;
    background: string;
    grid: string;
    text: string;
  };
  lineStyles: {
    zeroGamma: string;
    majorPositive: string;
    majorNegative: string;
    spot: string;
    previousClose: string;
  };
  dimensions: {
    dotRadius: number;
    lineThickness: number;
    fontSize: number;
    histogramWidth: number;
  };
  animation: {
    speed: number;
    smoothness: number;
  };
}
