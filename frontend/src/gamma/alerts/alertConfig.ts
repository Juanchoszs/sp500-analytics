/**
 * Alert configuration management
 */

import type { AlertConfig } from '../types/gammaTypes';
import { DEFAULT_ALERT_CONFIG } from '../config/chartConfig';

export const ALERT_CONFIG: AlertConfig = DEFAULT_ALERT_CONFIG;

export const ALERT_TYPES = {
  MAJOR_POSITIVE: 'major_positive' as const,
  MAJOR_NEGATIVE: 'major_negative' as const,
  ZERO_GAMMA: 'zero_gamma' as const,
} as const;

export const ALERT_COOLDOWN_OPTIONS = [
  { label: '30 seconds', value: 30000 },
  { label: '1 minute', value: 60000 },
  { label: '5 minutes', value: 300000 },
  { label: '15 minutes', value: 900000 },
  { label: '30 minutes', value: 1800000 },
] as const;

export function getAlertLabel(type: string): string {
  switch (type) {
    case ALERT_TYPES.MAJOR_POSITIVE:
      return 'Major Positive';
    case ALERT_TYPES.MAJOR_NEGATIVE:
      return 'Major Negative';
    case ALERT_TYPES.ZERO_GAMMA:
      return 'Zero Gamma';
    default:
      return type;
  }
}

export function getAlertColor(type: string): string {
  switch (type) {
    case ALERT_TYPES.MAJOR_POSITIVE:
      return '#22c55e';
    case ALERT_TYPES.MAJOR_NEGATIVE:
      return '#ef4444';
    case ALERT_TYPES.ZERO_GAMMA:
      return '#f59e0b';
    default:
      return '#94a3b8';
  }
}
