// client.ts: minimal typed fetch wrapper for backend API (adds Bearer token + consistent errors).
// gives one consistent way to call the backend from the frontend.

import { getToken, setToken } from "@/lib/auth/token";
import { routes } from "@/lib/api/routes";
import { setCsrfToken as setCsrfTokenStore } from "@/lib/auth/csrf";
import type { CsrfResponse, RefreshResponse } from "@/types/api";


// a version of fetch's options (except remove the original body type from fetch options)
type ApiFetchOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;     // pass an object and we'll JSON.stringify it (e.g. { email, password })
  auth?: boolean;     // default true; set false for login/register (asking "should we attach the Bearer token?")
  headers?: Record<string, string>;
  __retry?: boolean;  // internal flag to indicate a retry request (for CSRF token rotation)
};

// Unauthorized handler: lets auth layer decide what to do on 401 (logout, redirect, etc.).
let onUnauthorized: (() => void) | null = null;

/**
 * Registers a global handler for unauthorized responses (HTTP 401).
 *
 * @param handler - Called when apiFetch receives a 401 response.
 */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// Consistent error object
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Attempts to pull a stable error code from a backend error response.
 * Used for behavior-specific UX (ex: EMAIL_NOT_VERIFIED, AI_QUOTA_EXCEEDED).
 */
export function getErrorCode(details: unknown): string | null {
  if (typeof details !== "object" || details === null) return null;
  if (!("code" in details)) return null;
  const code = (details as Record<string, unknown>).code;
  return typeof code === "string" && code.length > 0 ? code : null;
}


// Chooses the API base URL
function getBaseUrl(): string {
  // NEXT_PUBLIC_* is exposed to the browser (needed for frontend -> backend calls).
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3002/api/v1";
}

// Refresh token in flight: only one refresh request at a time.
let refreshInFlight: Promise<string | null> | null = null;

/**
 * Refreshes the token and CSRF token.
 * 
 * @returns The new token or null if the refresh failed.
 */
async function refreshOnce(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const baseUrl = getBaseUrl();

    // 1) Bootstrap CSRF (rotates server-side CSRF hash and returns a fresh token)
    const csrfResp = await fetch(`${baseUrl}${routes.auth.csrf()}`, {
      method: "GET",
      credentials: "include",
    });

    if (!csrfResp.ok) return null;

    const csrfData = (await csrfResp.json().catch(() => null)) as CsrfResponse | null;
    const csrfToken = csrfData?.csrfToken ?? null;
    if (!csrfToken) return null;

    setCsrfTokenStore(csrfToken);

    // 2) Refresh access token (rotates refresh cookie + rotates CSRF token)
    const refreshResp = await fetch(`${baseUrl}${routes.auth.refresh()}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: "{}",
    });

    if (!refreshResp.ok) return null;

    const refreshData = (await refreshResp.json().catch(() => null)) as RefreshResponse | null;
    const newToken = refreshData?.token ?? null;
    const newCsrf = refreshData?.csrfToken ?? null;

    if (!newToken || !newCsrf) return null;

    setToken(newToken);
    setCsrfTokenStore(newCsrf);

    return newToken;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}



/**
 * Main wrapper for backend API calls.
 * 
 * @param path - API path starting with `/` (example: `/applications`)
 * @param options - Fetch options plus: 
 *   - `body`: a plain object to send as JSON, 
 *   - `auth`: whether to attach the Bearer token (default: true)
 * 
 * @returns Parsed response data typed as `T`
 * 
 * ex usage: apiFetch(routes.auth.login(), { method: "POST", auth: false, body: { email, password } });
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {

  // Pull values out of options
  const { auth = true, body, headers: originalHeaders = {}, __retry = false, ...otherOptions } = options;    // ...otherOptions includes other fetch options like method, cache, etc.


  // Decide whether to attach token
  const token = auth ? getToken() : null;
  
  // Build url
  const baseUrl = getBaseUrl();
  const fullUrl = `${baseUrl}${path}`   // base + endpoint path

  // If we're sending FormData (file upload), DO NOT set JSON headers or stringify the body.
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const headers: Record<string, string> = { ...originalHeaders };

  // Only set JSON content-type when NOT FormData
  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  // If have a token → set header
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Build the body (if body is provided, stringify it only if not FormData)
  const fetchBody = (body === undefined) ? undefined : isFormData ? (body as FormData) : JSON.stringify(body);

  // Call fetch
  const response = await fetch(fullUrl, {
    headers,
    body: fetchBody,
    ...otherOptions,
  });

  // Handle the response
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json().catch(() => null) : await response.text().catch(() => "");

  // Handle non-2xx responses (errors)
  if (!response.ok) {

    // If this was an authenticated request, try a single refresh + retry once on 401.
    if (response.status === 401 && auth && !__retry) {
      // Try to refresh the token and CSRF token
      const newToken = await refreshOnce();

      // If the refresh was successful, retry the original request
      if (newToken) {
        // Retry the original request once (apiFetch will attach the new Bearer token)
        return apiFetch<T>(path, { ...options, __retry: true });
      }
    }

    // If refresh failed (or this wasn't eligible for refresh), fall back to app-defined unauthorized behavior.
    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
    }

    // Prefer a server-provided error message (if present); otherwise fall back to a generic message
    const message = (hasMessage(data) && String(data.message)) || `Request failed (${response.status})`;
    
    throw new ApiError(message, response.status, data);
  }

  // Return the data as whatever we parsed, typed as T
  return data as T;
}

/**
 * Type guard: checks whether an unknown value is an object that contains a "message" field. 
 * If this returns true, TypeScript will allow `x.message` safely.
 */
function hasMessage(x: unknown): x is { message: unknown } {
  
  //
  return typeof x === "object" && x !== null && "message" in x;
}
