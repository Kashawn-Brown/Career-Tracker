import { beforeEach, vi } from "vitest";
import { applyTestEnv } from "./testEnv.js";
import { truncateAllTables } from "./db.js";

// Runs before each test file (Vitest setupFiles).
// Keep this small: env defaults, deterministic mocks, DB cleanup hooks.
applyTestEnv();

/**
 * Avoid real network calls + noisy logs during tests.
 * AuthService uses sendEmail() for verify/reset flows, but tests should be deterministic.
 */
vi.mock("../../lib/email.js", () => ({
  sendEmail: vi.fn(async () => ({ id: "test-email-id" })),
}));

beforeEach(async () => {
  await truncateAllTables();
});
