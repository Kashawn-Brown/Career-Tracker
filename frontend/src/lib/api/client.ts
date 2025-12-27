// client.ts: minimal typed fetch wrapper for backend API (adds Bearer token + consistent errors).
// gives one consistent way to call the backend from the frontend.

import { getToken } from "@/lib/auth/token";

// a version of fetch's options (except remove the original body type from fetch options)
type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;     // pass an object and we'll JSON.stringify it (e.g. { email, password })
  auth?: boolean;     // default true; set false for login/register (asking "should we attach the Bearer token?")
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

// Chooses the API base URL
function getBaseUrl(): string {
  // NEXT_PUBLIC_* is exposed to the browser (needed for frontend -> backend calls).
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3002/api/v1";
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
  const { auth = true, body, headers, ...otherOptions } = options;    // ...otherOptions includes other fetch options like method, cache, etc.

  // Decide whether to attach token
  const token = auth ? getToken() : null;
  
  // Build url
  const baseUrl = getBaseUrl();
  const fullUrl = `${baseUrl}${path}`   // base + endpoint path

  // Call fetch
  const response = await fetch(fullUrl, {
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),  // If sending a JSON body → set header
      ...(token ? { Authorization: `Bearer ${token}` } : {}),   // If have a token → set header
      ...headers,   // apply any user-provided headers
    },
    body: body ? JSON.stringify(body) : undefined,    // If body is provided → stringify it
    ...otherOptions,
  });

  // Handle the response
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json().catch(() => null) : await response.text().catch(() => "");

  // Handle non-2xx responses (errors)
  if (!response.ok) {

    // Auto-logout hook: token is invalid/expired.
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
