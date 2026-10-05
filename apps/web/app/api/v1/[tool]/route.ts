import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getTool } from "@toolhub/registry";
import { UPLOAD_PREFIX, bucket, s3Client, safeName, type JobData } from "@toolhub/server-common";
import { apiAuth, apiError } from "@/lib/apiauth";
import { db } from "@/lib/db";
import { queue } from "@/lib/jobs";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const maxDuration = 300;

/** POST /api/v1/{tool} — multipart: `file` (repeat for multi-file tools) plus any option fields. Returns a job to poll. */
export async function POST(req: Request, { params }: { params: Promise<{ tool: string }> }) {
  const a = await apiAuth(req);
  if ("res" in a) return a.res;
  const tool = getTool((await params).tool);
  if (!tool || tool.engine !== "server" || tool.ui !== "file") return apiError(404, "unknown_tool", "Unknown tool. See GET /api/v1/tools.");
  const maxBytes = (a.bigFiles ? tool.limits?.proMB ?? 500 : tool.limits?.freeMB ?? 50) * 1024 * 1024;
  if (Number(req.headers.get("content-length") ?? 0) > maxBytes * (tool.multiple ? 20 : 1) + 1_000_000) return apiError(413, "too_large", "Request body is too large.");
  if (!(req.headers.get("content-type") ?? "").startsWith("multipart/form-data")) return apiError(400, "bad_request", "Send multipart/form-data with a 'file' field.");
  const form = await req.formData().catch(() => null);
  const files = (form?.getAll("file") ?? []).filter((f): f is File => typeof f !== "string");
  if (!files.length || files.length > (tool.multiple ? 20 : 1)) return apiError(400, "bad_request", tool.multiple ? "Send 1–20 'file' fields." : "Send exactly one 'file' field.");

  let bytes = 0;
  for (const f of files) {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (tool.accept && !tool.accept.includes(ext)) return apiError(400, "unsupported_type", `Unsupported file type. Accepted: ${tool.accept.join(", ")}`);
    if (!f.size || f.size > maxBytes) return apiError(413, "too_large", `File exceeds the ${maxBytes / 1048576} MB limit for your plan.`);
    bytes += f.size;
  }
  const options: Record<string, string> = {};
  for (const o of tool.options ?? []) { const v = form?.get(o.key); options[o.key] = String(typeof v === "string" && v !== "" ? v : o.default).slice(0, 200); }

  const s3 = s3Client(), keys: string[] = [];
  try {
    for (const f of files) {
      const Key = `${UPLOAD_PREFIX}${randomUUID()}`; // never the user's file name
      await s3.send(new PutObjectCommand({ Bucket: bucket(), Key, Body: Readable.fromWeb(f.stream() as never), ContentLength: f.size }));
      keys.push(Key);
    }
  } catch { return apiError(502, "storage", "Could not store the upload. Try again."); }

  const names = files.map((f) => safeName(f.name)), data: JobData = { tool: tool.slug, inputKeys: keys, inputNames: names, options }, id = randomUUID();
  await db.job.create({ data: { id, userId: a.user.id, tool: tool.slug, inputNames: names, bytesIn: BigInt(bytes), expiresAt: new Date(Date.now() + 3600_000) } });
  await queue().add(tool.slug, data, { jobId: id });
  return NextResponse.json({ id, status: "queued", tool: tool.slug, statusUrl: `${SITE_URL}/api/v1/jobs/${id}`, requestsRemainingToday: a.remaining }, { status: 202 });
}
