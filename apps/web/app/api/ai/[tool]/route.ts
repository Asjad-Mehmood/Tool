import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getTool } from "@toolhub/registry";
import { AI_TOOLS, LANGUAGES, MAX_CHARS, aiConfigured, creditsFor, streamAi, type AiInput, type AiTool, type Piece } from "@/lib/ai";
import { currentUser } from "@/lib/auth";
import { balanceOf, refundCredits, spendCredits } from "@/lib/credits";
import { limited } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const err = (error: string, status: number, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status });

/** POST { text, question?, history?, language?, length? } → streamed plain text. Requires sign-in and credits. */
export async function POST(req: Request, { params }: { params: Promise<{ tool: string }> }) {
  const slug = (await params).tool as AiTool;
  if (!AI_TOOLS.includes(slug) || !getTool(slug)) return err("Unknown tool", 404);
  const user = await currentUser();
  if (!user) return err("Sign in to use AI tools", 401, { code: "auth" });
  if (await limited(`ai:${user.id}`, 20, 60_000)) return err("Too many requests — wait a moment", 429);
  if (!aiConfigured()) return err("AI tools aren't configured on this server yet", 503, { code: "config" });

  const b = (await req.json().catch(() => null)) as Partial<AiInput> | null;
  const text = typeof b?.text === "string" ? b.text.trim() : "";
  if (!text) return err("No text to process — scanned PDFs need OCR first", 400);
  if (text.length > MAX_CHARS[slug]) return err(`This document is too long for this tool (max ${MAX_CHARS[slug].toLocaleString()} characters of text${slug === "translate-pdf" ? " — split it first" : ""})`, 413);
  const question = typeof b?.question === "string" ? b.question.trim().slice(0, 2000) : "";
  if (slug === "chat-with-pdf" && !question) return err("Ask a question", 400);
  if (slug === "translate-pdf" && !LANGUAGES.includes(String(b?.language))) return err("Choose a language", 400);
  const history = Array.isArray(b?.history) ? b!.history.filter((t) => (t?.role === "user" || t?.role === "assistant") && typeof t.content === "string") : [];
  const input: AiInput = { tool: slug, text, question, history, language: b?.language, length: b?.length };

  const cost = creditsFor(slug, text.length), spent = await spendCredits(user.id, cost);
  if (!spent.ok) return err(`This needs ${cost} credit${cost === 1 ? "" : "s"} but you have ${spent.balance.total}. Buy a credit pack or upgrade.`, 402, { code: "credits", needed: cost, balance: spent.balance.total });

  // Pull the first piece before replying so failures that happen up front return a clean JSON error (and a refund).
  const it = streamAi(input, req.signal)[Symbol.asyncIterator]();
  let first: IteratorResult<Piece>;
  try { first = await it.next(); }
  catch (e) {
    await refundCredits(user.id, spent);
    console.error("ai start failed:", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : (e as Error).message);
    if (e instanceof Anthropic.RateLimitError || (e instanceof Anthropic.APIError && (e.status ?? 0) >= 500)) return err("The AI service is busy — you weren't charged, please try again shortly", 503);
    return err("The AI request failed — you weren't charged", 502);
  }

  const enc = new TextEncoder(), left = balanceOf({ ...user, ...(await freshCredits(user.id)) }).total;
  let produced = false, refunded = false;
  const refund = async () => { if (!refunded) { refunded = true; await refundCredits(user.id, spent); } };
  const body = new ReadableStream<Uint8Array>({
    async start(c) {
      try {
        let cur = first;
        while (!cur.done) {
          const p = cur.value;
          if ("text" in p) { produced = true; c.enqueue(enc.encode(p.text)); }
          else if (p.end === "refusal") { if (!produced) await refund(); c.enqueue(enc.encode(`\n\n[The AI declined to process this document.${produced ? "" : " You weren't charged."}]`)); }
          else if (p.end === "max_tokens") c.enqueue(enc.encode("\n\n[Output was cut off because it was too long.]"));
          cur = await it.next();
        }
        if (!produced) await refund();
      } catch (e) {
        if (!req.signal.aborted) { if (!produced) await refund(); console.error("ai stream failed:", (e as Error).message); c.enqueue(enc.encode("\n\n[Something went wrong while generating — please try again.]")); }
      } finally { c.close(); }
    },
  });
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-credits-left": String(left), "x-credits-used": String(cost) } });
}

async function freshCredits(id: string) {
  const { db } = await import("@/lib/db");
  const u = await db.user.findUnique({ where: { id }, select: { plan: true, aiCredits: true, creditMonth: true, creditMonthUsed: true } });
  return u ?? {};
}
