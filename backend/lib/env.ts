/**
 * Minimal startup env validation.
 * 
 * Want to fail fast with a clear log instead of mystery 500s.
 */
const REQUIRED_VARS = ["DATABASE_URL", "JWT_SECRET"] as const;
type RequiredVar = (typeof REQUIRED_VARS)[number];

export function validateEnv(): void {
  const missing: RequiredVar[] = [];

  for (const key of REQUIRED_VARS) {
    const value = process.env[key];
    if (!value || value.trim() === "") missing.push(key);
  }

  if (missing.length > 0) {
    console.error(`[startup] Missing required environment variable(s): ${missing.join(", ")}`);
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }

  if (process.env.NODE_ENV === "production" && !process.env.REDIS_URL) {
    console.warn("[startup] REDIS_URL not set. Rate limiting will be per-instance in production.");
  }

  if (process.env.NODE_ENV === "production") {
    if (!process.env.RESEND_API_KEY) {
      console.warn("[startup] RESEND_API_KEY not set. Email flows will fail.");
    }
    if (!process.env.EMAIL_FROM) {
      console.warn("[startup] EMAIL_FROM not set. Email flows will fail.");
    }
    if (!process.env.FRONTEND_URL) {
      console.warn("[startup] FRONTEND_URL not set. Email links may be wrong.");
    }
  }


}
