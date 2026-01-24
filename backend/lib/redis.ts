import { Redis } from "ioredis";

/**
 * Redis singleton (dev-friendly).
 * - If REDIS_URL is not set, returns null and app falls back to in-memory rate limiting.
 * - In prod, we *strongly* recommend setting REDIS_URL (Upstash).
 */

const globalForRedis = globalThis as unknown as { redis?: Redis };

function getRedisUrl(): string | null {
  const url = process.env.REDIS_URL?.trim();
  return url && url.length > 0 ? url : null;
}

export function getRedisClient(): Redis | null {
  const url = getRedisUrl();
  if (!url) return null;

  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(url, {
      // Keeps startup resilient; ioredis will reconnect if needed.
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }

  return globalForRedis.redis;
}
