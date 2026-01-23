import crypto from "node:crypto";

/**
 * Small crypto helpers used by auth/session code.
 *
 * - Tokens are generated randomly.
 * - Store only hashes in the DB (never raw tokens).
 */

export function generateToken(bytes = 32): string {
  // base64url = URL-safe, compact token string
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
