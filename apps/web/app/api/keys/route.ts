import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { hashKey } from "@/lib/apikeys";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (!PLANS[u.plan].apiPerDay) return NextResponse.json({ error: "API access requires a Pro or Team plan" }, { status: 403 });
  const name = String(((await req.json().catch(() => ({}))) as { name?: string }).name ?? "").trim().slice(0, 60);
  if (!name) return NextResponse.json({ error: "Give the key a name" }, { status: 400 });
  if ((await db.apiKey.count({ where: { userId: u.id, revokedAt: null } })) >= 10) return NextResponse.json({ error: "Key limit reached (10)" }, { status: 400 });
  const key = `th_live_${randomBytes(24).toString("base64url")}`; // shown once, only the hash is stored
  const rec = await db.apiKey.create({ data: { userId: u.id, name, hashedKey: hashKey(key), prefix: key.slice(0, 12) } });
  return NextResponse.json({ key, record: { id: rec.id, name, prefix: rec.prefix, lastUsed: null, createdAt: rec.createdAt.toISOString() } });
}
export async function DELETE(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const id = String(((await req.json().catch(() => ({}))) as { id?: string }).id ?? "");
  await db.apiKey.updateMany({ where: { id, userId: u.id }, data: { revokedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
