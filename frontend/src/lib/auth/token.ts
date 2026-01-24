/**
 * Token management utilities.
 * 
 * - In-memory access token store.
 * 
 * - Access tokens don't live in localStorage.
 * - The long-lived session is the httpOnly refresh cookie (server-managed).
 * - On page load, the app hydrates by calling /auth/csrf -> /auth/refresh.
 */ 

let inMemoryToken: string | null = null;

export function getToken(): string | null {
  return inMemoryToken;
}

export function setToken(token: string): void {
  inMemoryToken = token;
}

export function clearToken(): void {
  inMemoryToken = null;
}
