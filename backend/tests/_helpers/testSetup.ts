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

/**
 * Avoid GCS calls during tests.
 * Document endpoints call storage helpers; mock them to keep tests deterministic.
 */
vi.mock("../../lib/storage.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/storage.js")>();

  async function drainStream(stream: any): Promise<number> {
    // Multipart file streams must be consumed or they can cause hanging / leaks.
    if (!stream) return 0;

    let bytes = 0;

    return await new Promise<number>((resolve, reject) => {
      stream.on("data", (chunk: any) => {
        bytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk));
      });
      stream.on("end", () => resolve(bytes));
      stream.on("error", reject);

      // Ensure flowing mode.
      if (typeof stream.resume === "function") stream.resume();
    });
  }

  return {
    ...actual,

    uploadStreamToGcs: vi.fn(async ({ stream }: any) => {
      const sizeBytes = await drainStream(stream);
      return { sizeBytes };
    }),

    getSignedReadUrl: vi.fn(async ({ storageKey, filename }: any) => {
      return `https://signed-url.test/${encodeURIComponent(filename)}?key=${encodeURIComponent(storageKey)}`;
    }),

    deleteGcsObject: vi.fn(async () => {
      // no-op
    }),
  };
});

