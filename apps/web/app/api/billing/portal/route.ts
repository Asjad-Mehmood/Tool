import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const sub = await db.subscription.findUnique({ where: { userId: user.id } });
  if (!sub?.portalUrl) return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  return NextResponse.json({ url: sub.portalUrl });
}
