import { TimeUnit, formatDynamicTime } from './time-format';

/**
 * Generates a color for a model based on its name and position
 * Uses a combination of name hashing and golden ratio for better distribution
 */
export function generateModelColor(modelName: string, index: number, totalModels: number): string {
  // Use a combination of techniques for better color distribution
  
  // 1. Generate a hash from the model name
  let hash = 0;
  for (let i = 0; i < modelName.length; i++) {
    hash = ((hash << 5) - hash) + modelName.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  // 2. Use golden ratio for optimal spacing
  const goldenRatio = 0.618033988749895;
  
  // 3. Combine model name hash, index, and total models
  // This ensures colors are different even with similar names
  const hueOffset = ((hash % 360) / 360) + (index * goldenRatio);
  const hue = Math.floor((hueOffset % 1) * 360);
  
  // 4. Vary saturation and lightness based on index to ensure distinction
  // Use prime numbers to avoid patterns
  const saturation = 70 + ((index * 17) % 20); // 70-90%
  const lightness = 45 + ((index * 13) % 20);  // 45-65%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Formats a timestamp for display on the X axis
 */
export function formatAxisTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false
  });
}

/**
 * Formats a value for display in tooltips
 */
export function formatTooltipValue(value: number | string): string {
  if (typeof value === 'string') return value;
  
  // Format based on the magnitude of the value
  if (value === 0) return '0';
  
  if (value < 0.01) return value.toExponential(2);
  if (value < 1) return value.toFixed(2);
  if (value < 10) return value.toFixed(1);
  if (value < 100) return value.toFixed(1);
  if (value < 1000) return Math.round(value).toString();
  
  // For larger values, use K/M/B notation
  if (value < 1000000) return `${(value / 1000).toFixed(1)}K`;
  if (value < 1000000000) return `${(value / 1000000).toFixed(1)}M`;
  
  return `${(value / 1000000000).toFixed(1)}B`;
}

/**
 * Calculates the domain for a chart based on the values
 */
export function calculateChartDomain(values: number[]): [number, number] {
  if (values.length === 0) return [0, 10];
  
  // Filter out NaN, Infinity, etc.
  const validValues = values.filter(v => isFinite(v));
  if (validValues.length === 0) return [0, 10];
  
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  
  // If min and max are the same, create a small range
  if (min === max) {
    return [Math.max(0, min * 0.9), max * 1.1 || 10];
  }
  
  // Calculate a nice domain with some padding
  return [
    Math.max(0, min), // Don't go below 0 for most metrics
    max * 1.05 // Add 5% padding at the top
  ];
}

/**
 * Creates a data point for the chart
 */
export function createDataPoint(
  timestamp: string,
  modelMetrics: Record<string, number>,
  defaultValue = 0
): Record<string, string | number> {
  const dataPoint: Record<string, string | number> = {
    timestamp
  };
  
  // Add metrics for each model
  Object.entries(modelMetrics).forEach(([model, value]) => {
    dataPoint[model] = value ?? defaultValue;
  });
  
  return dataPoint;
}

/**
 * Get chart styles based on theme
 */
export function getChartStyles(isDarkMode: boolean) {
  return {
    background: isDarkMode ? '#0f172a' : '#ffffff',
    textColor: isDarkMode ? '#e2e8f0' : '#334155',
    gridColor: isDarkMode ? '#334155' : '#e2e8f0',
    axisColor: isDarkMode ? '#475569' : '#94a3b8',
    borderColor: isDarkMode ? '#475569' : '#cbd5e1',
    tooltipBackground: isDarkMode ? '#1e293b' : '#f8fafc',
  };
} 