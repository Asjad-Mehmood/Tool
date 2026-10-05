import { NextResponse } from "next/server";
import { handleWebhook, verifySignature } from "@/lib/billing";

export const runtime = "nodejs";

/** Lemon Squeezy webhook. The signature is verified over the raw body before anything is parsed. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-signature"))) return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  try { return NextResponse.json({ ok: true, result: await handleWebhook(JSON.parse(raw)) }); }
  catch (e) { console.error("webhook failed:", (e as Error).message); return NextResponse.json({ error: "Webhook failed" }, { status: 500 }); } // 500 makes the provider retry
}
