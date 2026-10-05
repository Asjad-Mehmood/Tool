import { NextResponse } from "next/server";
import { getTool } from "@toolhub/registry";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const slugOf = async (req: Request) => { const t = ((await req.json().catch(() => ({}))) as { tool?: string }).tool; return t && getTool(t) ? t : null; };

export async function GET() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ favorites: [] });
  return NextResponse.json({ favorites: (await db.favorite.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" } })).map((f) => f.tool) });
}
export async function POST(req: Request) {
  const u = await currentUser(), tool = await slugOf(req);
  if (!u) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (!tool) return NextResponse.json({ error: "Unknown tool" }, { status: 400 });
  await db.favorite.upsert({ where: { userId_tool: { userId: u.id, tool } }, create: { userId: u.id, tool }, update: {} });
  return NextResponse.json({ ok: true });
}
export async function DELETE(req: Request) {
  const u = await currentUser(), tool = await slugOf(req);
  if (!u) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (tool) await db.favorite.deleteMany({ where: { userId: u.id, tool } });
  return NextResponse.json({ ok: true });
}
