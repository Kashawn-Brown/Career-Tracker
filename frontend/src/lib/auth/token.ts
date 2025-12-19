// token.ts: MVP JWT storage helper (localStorage). Later can migrate to httpOnly cookies.

const STORAGE_KEY = "career_tracker_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null; // SSR safety
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
