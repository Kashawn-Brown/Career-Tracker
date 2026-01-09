import { Storage } from "@google-cloud/storage";

/**
 * Central place for GCS config + client creation.
 *
 * - env parsing stays consistent
 * - limits are enforced server-side (not just UI)
 */

// Type for GCS configuration
export type GcsConfig = {
  bucketName: string;
  maxUploadBytes: number;
  signedUrlTtlSeconds: number;
  allowedMimeTypes: Set<string>;
};

// Default values for GCS configuration
const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const DEFAULT_SIGNED_URL_TTL_SECONDS = 10 * 60; // 10 minutes
const DEFAULT_ALLOWED_MIME_TYPES = ["application/pdf", "text/plain"];

/**
 * Parses environment variable lists. Supports both "a|b|c" and "a,b,c" formats.
 */
function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\|,]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Parses a number from an environment variable, with a fallback value
function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Reads and validates config required for Documents uploads.
 * Throws a clear error if misconfigured.
 */
export function getGcsConfig(): GcsConfig {
  const bucketName = process.env.GCS_BUCKET?.trim();
  if (!bucketName) {
    throw new Error("[startup] Missing GCS_BUCKET (required for document uploads).");
  }

  const maxUploadBytes = parseNumber(process.env.GCS_MAX_UPLOAD_BYTES, DEFAULT_MAX_UPLOAD_BYTES);
  const signedUrlTtlSeconds = parseNumber(
    process.env.GCS_SIGNED_URL_TTL_SECONDS,
    DEFAULT_SIGNED_URL_TTL_SECONDS
  );

  const allowed =
    parseList(process.env.GCS_ALLOWED_MIME_TYPES).length > 0
      ? parseList(process.env.GCS_ALLOWED_MIME_TYPES)
      : DEFAULT_ALLOWED_MIME_TYPES;

  return {
    bucketName,
    maxUploadBytes,
    signedUrlTtlSeconds,
    allowedMimeTypes: new Set(allowed),
  };
}

let storageClient: Storage | null = null;

/**
 * Creates a singleton Storage client.
 * In Cloud Run, this uses Application Default Credentials (the runtime service account).
 */
export function getStorageClient(): Storage {
  if (!storageClient) storageClient = new Storage();
  return storageClient;
}
