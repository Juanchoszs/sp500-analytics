/** Sistema de diseño compartido para todos los gráficos del dashboard. */
export const CHART_COLORS = {
  call: "#22C55E",
  put: "#EF4444",
  net: "#60A5FA",
  spot: "#F8FAFC",
  zeroGamma: "#F59E0B",
  callWall: "#22C55E",
  putWall: "#EF4444",
  grid: "rgba(51, 65, 85, 0.35)",
  axis: "#94A3B8",
  tooltipBg: "#0F172A",
  tooltipBorder: "#334155",
  cursor: "rgba(255, 255, 255, 0.04)",
  dealerBuy: "rgba(34, 197, 94, 0.08)",
  dealerSell: "rgba(239, 68, 68, 0.08)",
} as const;

export const CHART_FONTS = {
  mono: "IBM Plex Mono, monospace",
  sans: "Inter, sans-serif",
} as const;

export const CHART_MARGINS = {
  default: { top: 12, right: 16, left: 8, bottom: 24 },
  compact: { top: 8, right: 12, left: 4, bottom: 20 },
} as const;

export const axisTickStyle = {
  fill: CHART_COLORS.axis,
  fontSize: 10,
  fontFamily: CHART_FONTS.mono,
};

export const tooltipStyle = {
  backgroundColor: CHART_COLORS.tooltipBg,
  border: `1px solid ${CHART_COLORS.tooltipBorder}`,
  borderRadius: 8,
  fontFamily: CHART_FONTS.mono,
  fontSize: 11,
};
