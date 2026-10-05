import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { balanceOf } from "@/lib/credits";
import { PLANS } from "@/lib/plans";
import { usageToday } from "@/lib/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight identity + usage for the client (pages stay statically generated). */
export async function GET() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ user: null }, { headers: { "cache-control": "no-store" } });
  return NextResponse.json({ user: { id: u.id, name: u.name, email: u.email, image: u.image, plan: u.plan, planName: PLANS[u.plan].name, ads: PLANS[u.plan].ads, credits: balanceOf(u), tasksToday: await usageToday(u.id), tasksPerDay: PLANS[u.plan].tasksPerDay } }, { headers: { "cache-control": "no-store" } });
}
