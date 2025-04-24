export interface PerformanceMetrics {
  responseTime: number;
  tokensPerSecond: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  processingTime: number;
  contextSize?: number;
  memoryUsed?: number;
}

export interface ModelMetrics {
  responseTime: number;
  tokensPerSecond: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  processingTime: number;
  contextSize?: number;
  memoryUsed?: number;
}

export interface PerformanceDataPoint {
  timestamp: string;
  [modelId: string]: number | string;
}

export interface ModelProgress {
  startTime: number;
  isComplete: boolean;
  progress?: number;
  metrics?: ModelMetrics;
}

export interface ChartStyles {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  gridColor: string;
  tooltipBackground: string;
  axisColor: string;
}

// Theme-aware chart styles
export const getChartStyles = (isDarkMode: boolean): ChartStyles => ({
  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
  borderColor: isDarkMode ? '#374151' : '#E5E7EB',
  textColor: isDarkMode ? '#9CA3AF' : '#4B5563',
  gridColor: isDarkMode ? '#374151' : '#E5E7EB',
  tooltipBackground: isDarkMode ? '#1F2937' : '#FFFFFF',
  axisColor: isDarkMode ? '#6B7280' : '#9CA3AF'
}); 