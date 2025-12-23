/**
 * Authentication token utilities
 * Provides centralized token management for the application
 */

const TOKEN_KEY = 'authToken';

/**
 * Retrieves the authentication token from localStorage
 * Returns null if running on server-side or if token doesn't exist
 */
export function getAuthToken(): string | null {
  // Check if we're running in the browser
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
}

/**
 * Stores the authentication token in localStorage
 * @param token - The JWT token to store
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') {
    console.warn('Cannot set auth token on server-side');
    return;
  }

  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing auth token:', error);
  }
}

/**
 * Removes the authentication token from localStorage
 * Called during logout or when token becomes invalid
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') {
    console.warn('Cannot clear auth token on server-side');
    return;
  }

  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error clearing auth token:', error);
  }
}

/**
 * Checks if a valid authentication token exists
 * @returns true if token exists and is not empty
 */
export function hasAuthToken(): boolean {
  const token = getAuthToken();
  return token !== null && token.trim().length > 0;
}

/**
 * Decodes JWT token payload (without verification)
 * Note: This is for reading claims only, not for security validation
 * @param token - JWT token to decode
 * @returns Decoded payload or null if invalid
 */
export function decodeTokenPayload(
  token: string
): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error decoding token payload:', error);
    return null;
  }
}

/**
 * Checks if the token is expired based on its 'exp' claim
 * @param token - JWT token to check
 * @returns true if token is expired or invalid
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeTokenPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return true;
  }

  // JWT exp is in seconds, Date.now() is in milliseconds
  const expirationTime = payload.exp * 1000;
  return Date.now() >= expirationTime;
}
