/**
 * Retry utility for handling API rate limiting and transient failures
 * Implements exponential backoff strategy for 429 responses
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from './logger';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  retryCondition?: (error: any) => boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  retryCondition: error => {
    // Retry on network errors or 429/5xx server errors
    return (
      !error.response ||
      error.response.status === 429 ||
      (error.response.status >= 500 && error.response.status < 600)
    );
  },
};

/**
 * Calculate delay for exponential backoff with jitter
 * @param attempt - Current attempt number (0-based)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @returns Delay in milliseconds
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);

  // Add jitter (±25% random variation) to avoid thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
  const delayWithJitter = exponentialDelay + jitter;

  // Cap at maxDelay
  return Math.min(delayWithJitter, maxDelay);
}

/**
 * Parse Retry-After header from 429 responses
 * @param retryAfterHeader - Value of Retry-After header
 * @returns Delay in milliseconds, or null if invalid
 */
function parseRetryAfterHeader(
  retryAfterHeader: string | undefined
): number | null {
  if (!retryAfterHeader) return null;

  // Retry-After can be in seconds (number) or HTTP date
  const seconds = parseInt(retryAfterHeader, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000; // Convert to milliseconds
  }

  // Try parsing as HTTP date
  const retryDate = new Date(retryAfterHeader);
  if (!isNaN(retryDate.getTime())) {
    const delay = retryDate.getTime() - Date.now();
    return Math.max(0, delay);
  }

  return null;
}

/**
 * Sleep for specified duration
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry mechanism for API calls with exponential backoff
 * @param fn - Function to retry (should return a Promise)
 * @param config - Retry configuration
 * @returns Promise that resolves/rejects after all retry attempts
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const result = await fn();

      // Success - log if this was a retry
      if (attempt > 0) {
        logger.info(`Request succeeded after ${attempt} retries`);
      }

      return result;
    } catch (error: any) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt === finalConfig.maxRetries) {
        break;
      }

      // Check if we should retry this error
      if (!finalConfig.retryCondition!(error)) {
        logger.debug('Error not retryable, failing immediately', { error });
        break;
      }

      // Calculate delay
      let delay: number;

      if (error.response?.status === 429) {
        // Use Retry-After header if available for 429 responses
        const retryAfterDelay = parseRetryAfterHeader(
          error.response.headers['retry-after']
        );
        delay =
          retryAfterDelay ||
          calculateDelay(attempt, finalConfig.baseDelay, finalConfig.maxDelay);

        logger.warn(
          `Rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${finalConfig.maxRetries})`,
          {
            url: error.config?.url,
            retryAfter: error.response.headers['retry-after'],
          }
        );
      } else {
        delay = calculateDelay(
          attempt,
          finalConfig.baseDelay,
          finalConfig.maxDelay
        );

        logger.warn(
          `Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${finalConfig.maxRetries})`,
          {
            url: error.config?.url,
            status: error.response?.status,
            message: error.message,
          }
        );
      }

      await sleep(delay);
    }
  }

  // All retries exhausted
  logger.error(`Request failed after ${finalConfig.maxRetries} retries`, {
    url: lastError?.config?.url,
    finalError: lastError,
  });

  throw lastError;
}
