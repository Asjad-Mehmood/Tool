import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getTool } from "@toolhub/registry";
import { UPLOAD_PREFIX, bucket, safeName, s3Client, type JobData } from "@toolhub/server-common";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { queue } from "@/lib/jobs";
import { clientIp, limited } from "@/lib/ratelimit";
import { consumeTask, whoIs } from "@/lib/quota";
import { verifyTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";
const KEY_RE = new RegExp(`^${UPLOAD_PREFIX}[0-9a-f-]{36}$`);
const s3 = () => s3Client();

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await limited(`jobs:${ip}`, 15, 60_000)) return NextResponse.json({ error: "Too many requests — slow down" }, { status: 429 });
  const b = (await req.json().catch(() => null)) as { tool?: string; fileKeys?: string[]; fileNames?: string[]; options?: Record<string, unknown>; turnstileToken?: string } | null;
  const tool = b?.tool ? getTool(b.tool) : undefined;
  if (!tool || tool.engine !== "server") return NextResponse.json({ error: "Unknown tool" }, { status: 404 });
  const keys = b?.fileKeys ?? [];
  if (!keys.length || keys.length > 20 || !keys.every((k) => KEY_RE.test(k))) return NextResponse.json({ error: "Invalid files" }, { status: 400 });

  const user = await currentUser(), who = whoIs(req, user);
  if (!user && !(await verifyTurnstile(b?.turnstileToken, ip))) return NextResponse.json({ error: "Please complete the human check and try again", code: "captcha" }, { status: 400 });

  // Trust the stored object sizes, not the client's claim.
  const maxBytes = (who.bigFiles ? tool.limits?.proMB ?? 500 : tool.limits?.freeMB ?? 50) * 1024 * 1024;
  let bytes = 0;
  try { for (const Key of keys) { const h = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key })); bytes += h.ContentLength ?? 0; if ((h.ContentLength ?? 0) > maxBytes) return NextResponse.json({ error: "File too large for your plan", code: "size" }, { status: 413 }); } }
  catch { return NextResponse.json({ error: "Upload not found — please upload again" }, { status: 400 }); }

  if (!(await consumeTask(who, bytes))) return NextResponse.json({ error: user ? `Daily limit of ${who.tasksPerDay} server tasks reached — it resets at midnight UTC, or upgrade for more.` : `Daily limit of ${who.tasksPerDay} server tasks reached — sign in for more.`, code: "quota" }, { status: 429 });

  // Only registry-declared options are forwarded; values are coerced to short strings.
  const options: Record<string, string> = {};
  for (const o of tool.options ?? []) { const v = b?.options?.[o.key]; options[o.key] = String(v ?? o.default).slice(0, 200); }
  const data: JobData = { tool: tool.slug, inputKeys: keys, inputNames: (b?.fileNames ?? []).map((n) => safeName(String(n))).slice(0, 20), options };
  const id = randomUUID(); // unguessable, so one person can't fetch another's result
  await db.job.create({ data: { id, userId: user?.id, tool: tool.slug, inputNames: data.inputNames, bytesIn: BigInt(bytes), ipHash: who.ipHash, expiresAt: new Date(Date.now() + 3600_000) } });
  await queue().add(tool.slug, data, { jobId: id });
  return NextResponse.json({ jobId: id });
}
