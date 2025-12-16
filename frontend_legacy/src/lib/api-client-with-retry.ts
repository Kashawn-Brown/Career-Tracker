/**
 * API client wrapper with automatic retry functionality
 * Provides the same interface as the base API client but with built-in retry logic
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from './api-client';
import { withRetry, RetryConfig } from './utils/retry';

// Type aliases using the actual axios instance types
type ApiResponse<T = any> = ReturnType<typeof apiClient.get<T>>;
type ApiConfig = Parameters<typeof apiClient.get>[1];

/**
 * Default retry configuration for API calls
 */
const DEFAULT_API_RETRY_CONFIG: Partial<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds (for severe rate limiting)
};

/**
 * API client with automatic retry for rate limiting and server errors
 * Wraps the base API client with retry logic for improved reliability
 */
class ApiClientWithRetry {
  /**
   * GET request with automatic retry
   */
  async get<T = any>(
    url: string,
    config?: ApiConfig
  ): Promise<ApiResponse<T>> {
    return withRetry(
      () => apiClient.get<T>(url, config),
      DEFAULT_API_RETRY_CONFIG
    );
  }

  /**
   * POST request with automatic retry
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: ApiConfig
  ): Promise<ApiResponse<T>> {
    return withRetry(
      () => apiClient.post<T>(url, data, config),
      DEFAULT_API_RETRY_CONFIG
    );
  }

  /**
   * PUT request with automatic retry
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: ApiConfig
  ): Promise<ApiResponse<T>> {
    return withRetry(
      () => apiClient.put<T>(url, data, config),
      DEFAULT_API_RETRY_CONFIG
    );
  }

  /**
   * PATCH request with automatic retry
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: ApiConfig
  ): Promise<ApiResponse<T>> {
    return withRetry(
      () => apiClient.patch<T>(url, data, config),
      DEFAULT_API_RETRY_CONFIG
    );
  }

  /**
   * DELETE request with automatic retry
   */
  async delete<T = any>(
    url: string,
    config?: ApiConfig
  ): Promise<ApiResponse<T>> {
    return withRetry(
      () => apiClient.delete<T>(url, config),
      DEFAULT_API_RETRY_CONFIG
    );
  }

  /**
   * HEAD request with automatic retry
   */
  async head<T = any>(
    url: string,
    config?: ApiConfig
  ): Promise<ApiResponse<T>> {
    return withRetry(
      () => apiClient.head<T>(url, config),
      DEFAULT_API_RETRY_CONFIG
    );
  }

  /**
   * Make a request with custom retry configuration
   * @param requestFn - Function that returns a Promise of the API call
   * @param retryConfig - Custom retry configuration
   */
  async requestWithCustomRetry<T>(
    requestFn: () => Promise<ApiResponse<T>>,
    retryConfig?: Partial<RetryConfig>
  ): Promise<ApiResponse<T>> {
    const finalConfig = { ...DEFAULT_API_RETRY_CONFIG, ...retryConfig };
    return withRetry(requestFn, finalConfig);
  }

  /**
   * Access to the underlying axios instance (without retry)
   * Use this when you need direct access or don't want retry behavior
   */
  get raw() {
    return apiClient;
  }
}

// Export singleton instance
const apiClientWithRetry = new ApiClientWithRetry();

/**
 * Enhanced API client with automatic retry for 429 and 5xx errors
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Respects Retry-After headers for 429 responses
 * - Configurable retry attempts and delays
 * - All standard HTTP methods (GET, POST, PUT, DELETE, etc.)
 * - Access to raw client via .raw property
 *
 * Usage:
 * ```typescript
 * // Standard usage (with retry)
 * const response = await apiClientWithRetry.get('/api/users');
 *
 * // Custom retry config
 * const response = await apiClientWithRetry.requestWithCustomRetry(
 *   () => apiClient.get('/api/critical-endpoint'),
 *   { maxRetries: 5, baseDelay: 2000 }
 * );
 *
 * // Without retry (direct access)
 * const response = await apiClientWithRetry.raw.get('/api/no-retry');
 * ```
 */
export default apiClientWithRetry;

// Also export the raw client for cases where retry is not desired
export { apiClient as apiClientRaw };
