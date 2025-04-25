// Browser-only logger implementation
// Define log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// Current log level - can be changed at runtime
let currentLogLevel = LogLevel.INFO;

// Define a type for loggable data
export type LoggableData = string | number | boolean | null | undefined | Record<string, unknown> | Array<unknown>;

// Format data for logging
function formatData(data: LoggableData): string {
  if (typeof data === 'object') {
    return JSON.stringify(data, null, 2);
  }
  return String(data);
}

// Main logging function
function log(level: LogLevel, message: string, data?: LoggableData): void {
  if (level < currentLogLevel) return;

  const timestamp = new Date().toISOString();
  const levelName = LogLevel[level];
  
  let logMessage = `[${timestamp}] [${levelName}] ${message}`;
  
  if (data !== undefined) {
    logMessage += '\n' + formatData(data);
  }
  
  // Log to console
  switch (level) {
    case LogLevel.DEBUG:
      console.debug(logMessage);
      break;
    case LogLevel.INFO:
      console.info(logMessage);
      break;
    case LogLevel.WARN:
      console.warn(logMessage);
      break;
    case LogLevel.ERROR:
      console.error(logMessage);
      break;
  }
}

// Browser-compatible logging function that saves to localStorage
export function browserLog(key: string, data: LoggableData): void {
  try {
    if (typeof window !== 'undefined') {
      // Get existing logs
      const existingLogs = localStorage.getItem('llm-comparison-logs') || '{}';
      const logs = JSON.parse(existingLogs) as Record<string, LoggableData>;
      
      // Add new log with timestamp
      logs[`${key}-${Date.now()}`] = data;
      
      // Keep only the last 50 logs to avoid localStorage size limits
      const keys = Object.keys(logs).sort();
      if (keys.length > 50) {
        const keysToRemove = keys.slice(0, keys.length - 50);
        keysToRemove.forEach(k => delete logs[k]);
      }
      
      // Save back to localStorage
      localStorage.setItem('llm-comparison-logs', JSON.stringify(logs));
      
      // Also log to console
      console.log(`[BROWSER LOG] ${key}:`, data);
    }
  } catch (error) {
    console.error('Failed to save log to localStorage:', error);
  }
}

// Export convenience methods
export const logger = {
  setLevel: (level: LogLevel) => { currentLogLevel = level; },
  debug: (message: string, data?: LoggableData) => log(LogLevel.DEBUG, message, data),
  info: (message: string, data?: LoggableData) => log(LogLevel.INFO, message, data),
  warn: (message: string, data?: LoggableData) => log(LogLevel.WARN, message, data),
  error: (message: string, data?: LoggableData) => log(LogLevel.ERROR, message, data),
  browserLog
};

// Export a function to get all browser logs
export function getBrowserLogs(): Record<string, LoggableData> {
  try {
    if (typeof window !== 'undefined') {
      const logs = localStorage.getItem('llm-comparison-logs') || '{}';
      return JSON.parse(logs) as Record<string, LoggableData>;
    }
  } catch (error) {
    console.error('Failed to retrieve logs from localStorage:', error);
  }
  return {};
}

// Export a function to clear browser logs
export function clearBrowserLogs(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('llm-comparison-logs');
    }
  } catch (error) {
    console.error('Failed to clear logs from localStorage:', error);
  }
}

export default logger; 