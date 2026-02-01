import { applyTestEnv } from "./testEnv.js";
import { migrateTestDb, truncateAllTables, disconnectTestDb } from "./db.js";

/**
 * Runs once before any test files.
 *
 * - applies env defaults (DATABASE_URL, JWT_SECRET, etc.)
 * - applies all Prisma migrations to the test DB
 * - starts from a clean database state
 */
export default async function globalSetup() {
  applyTestEnv();
  migrateTestDb();
  await truncateAllTables();

  return async () => {
    await disconnectTestDb();
  };
}
