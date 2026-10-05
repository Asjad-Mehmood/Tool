import { appRedis, markRedisDown } from "./redis";

// Fixed-window limiter backed by Redis (shared across instances), falling back to per-process memory if Redis is unavailable.
const mem = new Map<string, number[]>();
function memLimited(key: string, max: number, windowMs: number) {
  const now = Date.now(), arr = (mem.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { mem.set(key, arr); return true; }
  arr.push(now); mem.set(key, arr);
  if (mem.size > 10_000) for (const [k, v] of mem) if (!v.some((t) => now - t < windowMs)) mem.delete(k);
  return false;
}

/** True when `key` has exceeded `max` hits in the current window. */
export async function limited(key: string, max: number, windowMs: number): Promise<boolean> {
  const r = appRedis();
  if (r) {
    try {
      const k = `rl:${key}:${Math.floor(Date.now() / windowMs)}`, n = await r.incr(k);
      if (n === 1) await r.pexpire(k, windowMs);
      return n > max;
    } catch { markRedisDown(); }
  }
  return memLimited(key, max, windowMs);
}
export const clientIp = (req: Request) => req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? "unknown";
