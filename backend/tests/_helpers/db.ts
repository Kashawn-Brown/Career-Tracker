import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyTestEnv } from "./testEnv.js";

// Resolve the backend root (used when running Prisma CLI commands).
const backendRoot = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));

async function getPrisma() {
  // Ensure env is applied BEFORE Prisma is imported (Prisma reads DATABASE_URL at import time).
  applyTestEnv();

  const { prisma } = await import("../../lib/prisma.js");
  return prisma;
}

/**
 * Apply all Prisma migrations to the test DB.
 *
 * Runs once per test suite (via Vitest globalSetup).
 */
export function migrateTestDb(): void {
  applyTestEnv();

  execSync("npx prisma migrate deploy", {
    cwd: backendRoot,
    env: process.env,
    stdio: "inherit",
  });
}

/**
 * Truncate all app tables and reset sequences.
 *
 * Note: table names match @@map(...) in prisma/schema.prisma.
 */
export async function truncateAllTables(): Promise<void> {
  const prisma = await getPrisma();

  // Ordering is not important with TRUNCATE ... CASCADE.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "application_connections",
      "ai_artifacts",
      "documents",
      "connections",
      "job_applications",
      "ai_pro_requests",
      "email_verification_tokens",
      "password_reset_tokens",
      "oauth_accounts",
      "auth_sessions",
      "users"
    RESTART IDENTITY CASCADE;
  `);
}

export async function disconnectTestDb(): Promise<void> {
  const prisma = await getPrisma();
  await prisma.$disconnect();
}
