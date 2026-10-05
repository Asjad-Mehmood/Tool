import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import type { Plan } from "@toolhub/db";

export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);

export interface Balance { monthlyLeft: number; purchased: number; total: number }
export function balanceOf(u: { plan: Plan; aiCredits: number; creditMonth: string; creditMonthUsed: number }): Balance {
  const used = u.creditMonth === monthKey() ? u.creditMonthUsed : 0, monthlyLeft = Math.max(0, PLANS[u.plan].monthlyCredits - used);
  return { monthlyLeft, purchased: u.aiCredits, total: monthlyLeft + u.aiCredits };
}

/** Atomically spend credits (monthly allowance first, then purchased). Optimistic retry guards against concurrent spends. */
export async function spendCredits(userId: string, n: number): Promise<{ ok: true; fromMonthly: number; fromPurchased: number } | { ok: false; balance: Balance }> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const u = await db.user.findUnique({ where: { id: userId } });
    if (!u) throw new Error("User not found");
    const bal = balanceOf(u);
    if (bal.total < n) return { ok: false, balance: bal };
    const fromMonthly = Math.min(bal.monthlyLeft, n), fromPurchased = n - fromMonthly, month = monthKey();
    const r = await db.user.updateMany({
      where: { id: userId, creditMonth: u.creditMonth, creditMonthUsed: u.creditMonthUsed, aiCredits: u.aiCredits },
      data: { creditMonth: month, creditMonthUsed: (u.creditMonth === month ? u.creditMonthUsed : 0) + fromMonthly, aiCredits: u.aiCredits - fromPurchased },
    });
    if (r.count === 1) return { ok: true, fromMonthly, fromPurchased };
  }
  throw new Error("Could not update credits — please retry");
}

/** Give credits back after a failed AI call. */
export async function refundCredits(userId: string, s: { fromMonthly: number; fromPurchased: number }) {
  await db.user.update({ where: { id: userId }, data: { creditMonthUsed: { decrement: s.fromMonthly }, aiCredits: { increment: s.fromPurchased } } });
}

/** Add purchased credits. `ref` makes it idempotent (webhooks can be delivered twice). Returns false if already applied. */
export async function grantCredits(userId: string, n: number, reason: string, ref?: string): Promise<boolean> {
  try {
    await db.$transaction([db.creditLedger.create({ data: { userId, delta: n, reason, ref } }), db.user.update({ where: { id: userId }, data: { aiCredits: { increment: n } } })]);
    return true;
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return false;
    throw e;
  }
}
