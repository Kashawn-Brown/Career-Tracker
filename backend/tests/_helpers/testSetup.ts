import { beforeEach } from "vitest";
import { applyTestEnv } from "./testEnv.js";
import { truncateAllTables } from "./db.js";

// Runs before each test file (Vitest setupFiles).
// We keep it very small: env defaults + DB cleanup hooks.
applyTestEnv();

beforeEach(async () => {
  await truncateAllTables();
});
