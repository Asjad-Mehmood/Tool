import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { ANON, PLANS } from "@/lib/plans";
import { clientIp } from "@/lib/ratelimit";
import type { Plan } from "@toolhub/db";

export const ipHash = (req: Request) => createHash("sha256").update(`${process.env.IP_HASH_SALT ?? "dev-salt"}:${clientIp(req)}`).digest("hex").slice(0, 32);
const today = () => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");

export interface Who { subject: string; userId: string | null; plan: Plan | null; tasksPerDay: number; bigFiles: boolean; ipHash: string }
export function whoIs(req: Request, user: { id: string; plan: Plan } | null): Who {
  const h = ipHash(req);
  return user
    ? { subject: user.id, userId: user.id, plan: user.plan, tasksPerDay: PLANS[user.plan].tasksPerDay, bigFiles: PLANS[user.plan].bigFiles, ipHash: h }
    : { subject: `ip:${h}`, userId: null, plan: null, tasksPerDay: ANON.tasksPerDay, bigFiles: false, ipHash: h };
}

export async function usageToday(subject: string) {
  return (await db.usage.findUnique({ where: { subject_date: { subject, date: today() } } }))?.tasks ?? 0;
}

/** Count one task against today's allowance. Returns false (and counts nothing) when the limit is reached. */
export async function consumeTask(who: Who, bytes: number): Promise<boolean> {
  const date = today(), row = await db.usage.upsert({ where: { subject_date: { subject: who.subject, date } }, create: { subject: who.subject, date, tasks: 1, bytes }, update: { tasks: { increment: 1 }, bytes: { increment: bytes } } });
  if (row.tasks > who.tasksPerDay) { await db.usage.update({ where: { id: row.id }, data: { tasks: { decrement: 1 }, bytes: { decrement: bytes } } }); return false; }
  return true;
}
