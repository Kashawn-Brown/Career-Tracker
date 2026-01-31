const DEFAULT_TEST_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5438/career_tracker_test?schema=public";

/**
 * Apply a sane, local default test environment.
 *
 * This is intentionally minimal: set only what the backend needs to boot and
 * authenticate requests. Other integrations (email, GCS, OAuth, OpenAI) are
 * configured per test suite (often via mocks) to keep tests isolated.
 */
export function applyTestEnv(): void {
  // Keep this idempotent so re-imports are harmless.
  if (!process.env.NODE_ENV) process.env.NODE_ENV = "test";

  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test_jwt_secret_change_me";

  // Use an explicit test DB by default.
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = DEFAULT_TEST_DATABASE_URL;

  // Used by URL builders + cookie helpers (safe defaults for tests).
  if (!process.env.FRONTEND_URL) process.env.FRONTEND_URL = "http://localhost:3000";
  if (!process.env.CORS_ORIGIN) process.env.CORS_ORIGIN = "http://localhost:3000";
}

export function getTestDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
}
