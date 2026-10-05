import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashKey } from "@/lib/apikeys";
import { PLANS } from "@/lib/plans";
import { clientIp, limited } from "@/lib/ratelimit";

export const apiError = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });
const today = () => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");

/** Authenticate `Authorization: Bearer th_live_…` and meter one request against the plan's daily API allowance. */
export async function apiAuth(req: Request) {
  if (await limited(`apiip:${clientIp(req)}`, 120, 60_000)) return { res: apiError(429, "rate_limited", "Too many requests — slow down.") };
  const m = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(th_live_[A-Za-z0-9_-]{20,})$/);
  if (!m) return { res: apiError(401, "unauthorized", "Missing or malformed API key. Send 'Authorization: Bearer th_live_…'.") };
  const key = await db.apiKey.findUnique({ where: { hashedKey: hashKey(m[1]) }, include: { user: true } });
  if (!key || key.revokedAt) return { res: apiError(401, "unauthorized", "Invalid or revoked API key.") };
  const plan = PLANS[key.user.plan];
  if (!plan.apiPerDay) return { res: apiError(403, "plan", "API access requires a Pro or Team plan.") };
  if (await limited(`apikey:${key.id}`, 60, 60_000)) return { res: apiError(429, "rate_limited", "Limit of 60 requests per minute per key.") };
  const date = today(), row = await db.usage.upsert({ where: { subject_date: { subject: `api:${key.userId}`, date } }, create: { subject: `api:${key.userId}`, date, tasks: 1 }, update: { tasks: { increment: 1 } } });
  if (row.tasks > plan.apiPerDay) { await db.usage.update({ where: { id: row.id }, data: { tasks: { decrement: 1 } } }); return { res: apiError(429, "quota", `Daily limit of ${plan.apiPerDay} API requests reached. It resets at midnight UTC.`) }; }
  void db.apiKey.update({ where: { id: key.id }, data: { lastUsed: new Date() } }).catch(() => {});
  return { user: key.user, key, remaining: plan.apiPerDay - row.tasks, bigFiles: plan.bigFiles };
}
