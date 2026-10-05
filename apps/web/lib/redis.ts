import { Redis } from "ioredis";

const g = globalThis as unknown as { __appRedis?: Redis; __redisDownUntil?: number };
/** Shared app Redis (rate limits). Returns null for a while after a failure so callers fall back quickly. */
export function appRedis(): Redis | null {
  if (g.__redisDownUntil && Date.now() < g.__redisDownUntil) return null;
  if (!g.__appRedis) {
    g.__appRedis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", { lazyConnect: true, maxRetriesPerRequest: 1, commandTimeout: 800, connectTimeout: 800, retryStrategy: () => null });
    g.__appRedis.on("error", () => { g.__redisDownUntil = Date.now() + 30_000; g.__appRedis?.disconnect(); g.__appRedis = undefined; });
  }
  return g.__appRedis;
}
export const markRedisDown = () => { g.__redisDownUntil = Date.now() + 30_000; };
