/**
 * Chart configuration for Gexbot-style gamma visualization
 */

import type { ChartConfig } from '../types/gammaTypes';
import { GAMMA_COLORS, LINE_STYLES, CHART_DIMENSIONS, ANIMATION_CONFIG, HISTORICAL_INTERVALS } from './colors';

// Re-export for use in other modules
export { GAMMA_COLORS, LINE_STYLES, CHART_DIMENSIONS, ANIMATION_CONFIG, HISTORICAL_INTERVALS };

export const CHART_CONFIG: ChartConfig = {
  colors: {
    positive: GAMMA_COLORS.positive,
    negative: GAMMA_COLORS.negative,
    dots: GAMMA_COLORS.dots,
    spot: GAMMA_COLORS.spot,
    background: GAMMA_COLORS.background,
    grid: GAMMA_COLORS.grid,
    text: GAMMA_COLORS.text,
  },
  lineStyles: {
    zeroGamma: GAMMA_COLORS.zeroGamma,
    majorPositive: GAMMA_COLORS.majorPositive,
    majorNegative: GAMMA_COLORS.majorNegative,
    spot: GAMMA_COLORS.spot,
    previousClose: GAMMA_COLORS.previousClose,
  },
  dimensions: {
    dotRadius: CHART_DIMENSIONS.dotRadius,
    lineThickness: CHART_DIMENSIONS.lineThickness,
    fontSize: CHART_DIMENSIONS.fontSize,
    histogramWidth: CHART_DIMENSIONS.histogramWidth,
  },
  animation: {
    speed: ANIMATION_CONFIG.speed,
    smoothness: ANIMATION_CONFIG.smoothness,
  },
};

export const DEFAULT_ALERT_CONFIG = {
  majorPositiveCrossing: true,
  majorNegativeCrossing: true,
  zeroGammaCrossing: true,
  cooldownMs: 60000, // 1 minute cooldown
};

export const SYNC_TOLERANCE_MS = 30000; // 30-second tolerance for data synchronization

export const EXPIRATION_MODES = ['latest', 'next', 'aggregate_90d'] as const;

export const PLAYBACK_SPEEDS = [0.5, 1, 2, 5, 10] as const; // Multipliers
