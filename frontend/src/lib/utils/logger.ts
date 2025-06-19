/**
 * Centralized logging utility for API events and application debugging
 * Provides controlled logging with different levels and environment awareness
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface ApiEventData {
  method?: string;
  url?: string;
  status?: number;
  duration?: number;
  requestData?: unknown;
  responseData?: unknown;
  error?: unknown;
}

interface LogConfig {
  enabled: boolean;
  level: LogLevel;
  includeTimestamp: boolean;
  includeStack: boolean;
}

/**
 * Get current logging configuration based on environment
 */
function getLogConfig(): LogConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  // Allow override via environment variable
  const logLevel =
    (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) ||
    (isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR);

  return {
    enabled: !isProduction || process.env.NEXT_PUBLIC_ENABLE_LOGGING === 'true',
    level: logLevel,
    includeTimestamp: isDevelopment,
    includeStack: isDevelopment,
  };
}

/**
 * Check if a log level should be output based on current configuration
 */
function shouldLog(level: LogLevel): boolean {
  const config = getLogConfig();
  if (!config.enabled) return false;

  const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  const currentLevelIndex = levels.indexOf(config.level);
  const requestedLevelIndex = levels.indexOf(level);

  return requestedLevelIndex >= currentLevelIndex;
}

/**
 * Format log message with optional timestamp and context
 */
function formatLogMessage(level: LogLevel, message: string): string {
  const config = getLogConfig();
  let formattedMessage = `[${level.toUpperCase()}]`;

  if (config.includeTimestamp) {
    formattedMessage += ` ${new Date().toISOString()}`;
  }

  formattedMessage += ` ${message}`;

  return formattedMessage;
}

/**
 * Core logging function that handles different log levels
 */
function log(level: LogLevel, message: string, data?: unknown): void {
  if (!shouldLog(level)) return;

  const formattedMessage = formatLogMessage(level, message);

  switch (level) {
    case LogLevel.DEBUG:
      console.debug(formattedMessage, data || '');
      break;
    case LogLevel.INFO:
      console.info(formattedMessage, data || '');
      break;
    case LogLevel.WARN:
      console.warn(formattedMessage, data || '');
      break;
    case LogLevel.ERROR:
      console.error(formattedMessage, data || '');
      break;
  }
}

/**
 * Log API events with structured data and appropriate log level
 * @param eventType - Type of API event (request, response, error)
 * @param data - Structured data about the API event
 */
export function logApiEvent(
  eventType: 'request' | 'response' | 'error',
  data: ApiEventData
): void {
  const { method = 'UNKNOWN', url = 'unknown', status, error } = data;

  switch (eventType) {
    case 'request':
      log(
        LogLevel.DEBUG,
        `API Request: ${method.toUpperCase()} ${url}`,
        data.requestData
      );
      break;

    case 'response':
      const isSuccess = status && status >= 200 && status < 300;
      log(
        isSuccess ? LogLevel.INFO : LogLevel.WARN,
        `API Response: ${status} ${method.toUpperCase()} ${url}${
          data.duration ? ` (${data.duration}ms)` : ''
        }`,
        data.responseData
      );
      break;

    case 'error':
      log(
        LogLevel.ERROR,
        `API Error: ${method.toUpperCase()} ${url}${
          status ? ` (${status})` : ''
        }`,
        error
      );
      break;
  }
}

/**
 * Log general application events
 * @param level - Log level for the message
 * @param message - Human-readable message
 * @param data - Optional additional data to log
 */
export function logEvent(
  level: LogLevel,
  message: string,
  data?: unknown
): void {
  log(level, message, data);
}

/**
 * Convenience functions for common log levels
 */
export const logger = {
  debug: (message: string, data?: unknown) =>
    log(LogLevel.DEBUG, message, data),
  info: (message: string, data?: unknown) => log(LogLevel.INFO, message, data),
  warn: (message: string, data?: unknown) => log(LogLevel.WARN, message, data),
  error: (message: string, data?: unknown) =>
    log(LogLevel.ERROR, message, data),
};

/**
 * Create a performance timer for measuring API call duration
 */
export function createPerformanceTimer(): {
  end: () => number;
} {
  const startTime = performance.now();

  return {
    end: () => Math.round(performance.now() - startTime),
  };
}
