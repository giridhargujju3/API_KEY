export interface TimeUnit {
  value: number;
  unit: 'ns' | 'μs' | 'ms' | 's' | 'min';
  label: string;
}

/**
 * Formats a time value in seconds to a human-readable string
 * - Less than 60 seconds: displays in seconds with 2 decimal places
 * - 60 seconds or more: displays in minutes with 2 decimal places
 */
export function formatProcessingTime(seconds: number): string {
  if (seconds < 60) {
    // Less than a minute, show in seconds
    return `${seconds.toFixed(2)}s`;
  } else {
    // Convert to minutes
    const minutes = seconds / 60;
    return `${minutes.toFixed(2)}min`;
  }
}

/**
 * Formats a time value in milliseconds to a human-readable string
 * - Less than 1000ms: displays in milliseconds with 2 decimal places
 * - 1000ms to 60000ms: displays in seconds with 2 decimal places
 * - 60000ms or more: displays in minutes with 2 decimal places
 */
export function formatResponseTime(milliseconds: number): string {
  if (milliseconds < 1000) {
    // Less than a second, show in milliseconds
    return `${milliseconds.toFixed(2)}ms`;
  } else if (milliseconds < 60000) {
    // Less than a minute, show in seconds
    const seconds = milliseconds / 1000;
    return `${seconds.toFixed(2)}s`;
  } else {
    // Convert to minutes
    const minutes = milliseconds / 60000;
    return `${minutes.toFixed(2)}min`;
  }
}

/**
 * Formats a dynamic time value based on its magnitude
 */
export function formatDynamicTime(nanoseconds: number): TimeUnit {
  if (nanoseconds < 1000) {
    return { value: nanoseconds, unit: 'ns', label: 'nanoseconds' };
  } else if (nanoseconds < 1000000) {
    return { value: nanoseconds / 1000, unit: 'μs', label: 'microseconds' };
  } else if (nanoseconds < 1000000000) {
    return { value: nanoseconds / 1000000, unit: 'ms', label: 'milliseconds' };
  } else if (nanoseconds < 60000000000) {
    return { value: nanoseconds / 1000000000, unit: 's', label: 'seconds' };
  } else {
    return { value: nanoseconds / 60000000000, unit: 'min', label: 'minutes' };
  }
}

export function getTimeUnitMultiplier(unit: TimeUnit['unit']): number {
  switch (unit) {
    case 'ns': return 1;
    case 'μs': return 1000;
    case 'ms': return 1000000;
    case 's': return 1000000000;
    case 'min': return 60000000000;
    default: return 1;
  }
}

export function convertTime(value: number, fromUnit: TimeUnit['unit'], toUnit: TimeUnit['unit']): number {
  const fromMultiplier = getTimeUnitMultiplier(fromUnit);
  const toMultiplier = getTimeUnitMultiplier(toUnit);
  return (value * fromMultiplier) / toMultiplier;
}

export function formatTimeValue(value: number, unit: TimeUnit['unit']): string {
  if (value < 0.01) return value.toExponential(2);
  if (value < 10) return value.toFixed(2);
  if (value < 100) return value.toFixed(1);
  return Math.round(value).toString();
} 