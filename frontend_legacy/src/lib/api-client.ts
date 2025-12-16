import axios from 'axios';
import { getAuthToken, clearAuthToken } from '@/lib/utils/token';
import { logApiEvent, logger } from '@/lib/utils/logger';

// Base API configuration
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  config => {
    // Add auth token if available
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log API request
    logApiEvent('request', {
      method: config.method,
      url: config.url,
      requestData: config.data,
    });

    // Store start time for performance measurement
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (config as any).startTime = performance.now();

    return config;
  },
  error => {
    logger.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  response => {
    // Calculate request duration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const startTime = (response.config as any).startTime;
    const duration = startTime
      ? Math.round(performance.now() - startTime)
      : undefined;

    // Log API response
    logApiEvent('response', {
      method: response.config.method,
      url: response.config.url,
      status: response.status,
      duration,
      responseData: response.data,
    });

    return response;
  },
  error => {
    // Calculate request duration if available
    const startTime = error.config
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error.config as any).startTime
      : undefined;
    const duration = startTime
      ? Math.round(performance.now() - startTime)
      : undefined;

    // Handle different error cases
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      // Log API error
      logApiEvent('error', {
        method: error.config?.method,
        url: error.config?.url,
        status,
        duration,
        error: data,
      });

      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          clearAuthToken();
          logger.warn('Unauthorized access - token cleared');
          break;
        case 403:
          // Forbidden
          logger.error('Access forbidden', { url: error.config?.url, data });
          break;
        case 404:
          // Not found
          logger.warn('Resource not found', { url: error.config?.url });
          break;
        case 429:
          // Too Many Requests - handled by retry mechanism
          logger.warn('Rate limit exceeded', {
            url: error.config?.url,
            retryAfter: error.response.headers['retry-after'],
            data,
          });
          break;
        case 500:
          // Server error
          logger.error('Server error', { url: error.config?.url, data });
          break;
        default:
          logger.error(`API Error ${status}`, { url: error.config?.url, data });
      }

      // Return structured error
      return Promise.reject({
        status,
        message: data?.message || 'An error occurred',
        data,
      });
    } else if (error.request) {
      // Network error
      logApiEvent('error', {
        method: error.config?.method,
        url: error.config?.url,
        duration,
        error: 'Network error',
      });

      logger.error('Network error - please check your connection', {
        message: error.message,
        url: error.config?.url,
      });

      return Promise.reject({
        status: 0,
        message: 'Network error - please check your connection',
        data: null,
      });
    } else {
      // Other error
      logger.error('Request setup error', {
        message: error.message,
        url: error.config?.url,
      });

      return Promise.reject({
        status: 0,
        message: error.message,
        data: null,
      });
    }
  }
);

export default apiClient;
