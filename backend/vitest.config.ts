import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Keep all DB-backed tests deterministic (no parallel test files).
    fileParallelism: false,

    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/_helpers/testSetup.ts"],
    globalSetup: ["tests/_helpers/globalSetup.ts"],

    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
