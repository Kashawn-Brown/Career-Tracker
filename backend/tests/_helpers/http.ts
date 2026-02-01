type HeadersLike = Record<string, any>;

/**
 * Fastify inject returns "set-cookie" as string | string[] | undefined.
 * This helper normalizes it into a string array.
 */
export function getSetCookieList(headers: HeadersLike): string[] {
  const raw = headers?.["set-cookie"];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

/**
 * Extract a cookie value from a Set-Cookie header list.
 * Example: "career_tracker_refresh=abc123; Path=/api/v1/auth; HttpOnly"
 */
export function getCookieValueFromSetCookie(setCookies: string[], cookieName: string): string | null {
  for (const line of setCookies) {
    const prefix = `${cookieName}=`;
    if (typeof line === "string" && line.startsWith(prefix)) {
      return line.slice(prefix.length).split(";")[0] ?? null;
    }
  }
  return null;
}

/**
 * Build a Cookie header for inject() calls.
 */
export function cookieHeader(cookieName: string, cookieValue: string): string {
  return `${cookieName}=${cookieValue}`;
}