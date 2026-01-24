// csrf.ts: in-memory CSRF token store (paired with refresh-cookie session).
// This lets both AuthContext and apiFetch share the latest CSRF token.

let inMemoryCsrfToken: string | null = null;

export function getCsrfToken(): string | null {
  return inMemoryCsrfToken;
}

export function setCsrfToken(token: string | null): void {
  inMemoryCsrfToken = token;
}

export function clearCsrfToken(): void {
  inMemoryCsrfToken = null;
}
