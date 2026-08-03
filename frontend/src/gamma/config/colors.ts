/**
 * Color configuration for Gexbot-style gamma visualization
 */

export const GAMMA_COLORS = {
  positive: '#22c55e',      // Green for positive gamma
  negative: '#ef4444',      // Red for negative gamma
  dots: '#3b82f6',          // Blue for historical dots
  spot: '#06b6d4',         // Cyan for spot price line
  background: '#0f172a',    // Dark background
  grid: '#1e293b',         // Grid lines
  text: '#94a3b8',         // Text color
  callWall: '#22c55e',     // Call wall color
  putWall: '#ef4444',      // Put wall color
  zeroGamma: '#f59e0b',     // Zero gamma color
  majorPositive: '#22c55e', // Major positive gamma
  majorNegative: '#ef4444', // Major negative gamma
  previousClose: '#8b5cf6', // Previous close color
  vwap: '#ec4899',         // VWAP color
} as const;

export const LINE_STYLES = {
  zeroGamma: { color: GAMMA_COLORS.zeroGamma, dashArray: '6 3', width: 2 },
  majorPositive: { color: GAMMA_COLORS.majorPositive, dashArray: '6 3', width: 2 },
  majorNegative: { color: GAMMA_COLORS.majorNegative, dashArray: '6 3', width: 2 },
  spot: { color: GAMMA_COLORS.spot, dashArray: '4 4', width: 2 },
  previousClose: { color: GAMMA_COLORS.previousClose, dashArray: '3 3', width: 1 },
  vwap: { color: GAMMA_COLORS.vwap, dashArray: '2 2', width: 1 },
} as const;

export const CHART_DIMENSIONS = {
  dotRadius: 4,
  lineThickness: 2,
  fontSize: 11,
  histogramWidth: 0.8, // 80% of available space
  barCornerRadius: 2,
} as const;

export const ANIMATION_CONFIG = {
  speed: 16, // ms per frame (60 FPS target)
  smoothness: 0.3, // Easing factor
  transitionDuration: 300, // ms
} as const;

export const HISTORICAL_INTERVALS = [5, 10, 15, 30] as const; // minutes
