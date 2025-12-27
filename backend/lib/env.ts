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
}
