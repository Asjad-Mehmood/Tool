import { NextResponse } from "next/server";
import { getTool } from "@toolhub/registry";
import { UPLOAD_PREFIX, safeName, type JobData } from "@toolhub/server-common";
import { queue } from "@/lib/jobs";
import { clientIp, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";
const KEY_RE = new RegExp(`^${UPLOAD_PREFIX}[0-9a-f-]{36}$`);

export async function POST(req: Request) {
  if (limited(`jobs:${clientIp(req)}`, 15, 60_000)) return NextResponse.json({ error: "Too many requests — slow down" }, { status: 429 });
  const b = (await req.json().catch(() => null)) as { tool?: string; fileKeys?: string[]; fileNames?: string[]; options?: Record<string, unknown> } | null;
  const tool = b?.tool ? getTool(b.tool) : undefined;
  if (!tool || tool.engine !== "server") return NextResponse.json({ error: "Unknown tool" }, { status: 404 });
  const keys = b?.fileKeys ?? [];
  if (!keys.length || keys.length > 20 || !keys.every((k) => KEY_RE.test(k))) return NextResponse.json({ error: "Invalid files" }, { status: 400 });
  // Only registry-declared options are forwarded; values are coerced to short strings.
  const options: Record<string, string> = {};
  for (const o of tool.options ?? []) { const v = b?.options?.[o.key]; options[o.key] = String(v ?? o.default).slice(0, 200); }
  const data: JobData = { tool: tool.slug, inputKeys: keys, inputNames: (b?.fileNames ?? []).map((n) => safeName(String(n))), options };
  const job = await queue().add(tool.slug, data);
  return NextResponse.json({ jobId: job.id });
}
