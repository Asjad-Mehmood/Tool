import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getTool } from "@toolhub/registry";
import { UPLOAD_PREFIX, bucket } from "@toolhub/server-common";
import { currentUser } from "@/lib/auth";
import { presignClient } from "@/lib/jobs";
import { clientIp, limited } from "@/lib/ratelimit";
import { usageToday, whoIs } from "@/lib/quota";

export const runtime = "nodejs";

/** POST { tool, files: [{ name, size }] } → presigned PUT URLs under random keys. */
export async function POST(req: Request) {
  if (await limited(`upload:${clientIp(req)}`, 30, 60_000)) return NextResponse.json({ error: "Too many requests — slow down" }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { tool?: string; files?: { name?: string; size?: number }[] } | null;
  const tool = body?.tool ? getTool(body.tool) : undefined;
  if (!tool || tool.engine !== "server" || tool.ui !== "file") return NextResponse.json({ error: "Unknown tool" }, { status: 404 });
  const files = body?.files ?? [];
  if (!files.length || files.length > (tool.multiple ? 20 : 1)) return NextResponse.json({ error: "Wrong number of files" }, { status: 400 });
  const who = whoIs(req, await currentUser());
  if ((await usageToday(who.subject)) >= who.tasksPerDay) return NextResponse.json({ error: who.userId ? `Daily limit of ${who.tasksPerDay} server tasks reached. It resets at midnight UTC — or upgrade for more.` : `Daily limit of ${who.tasksPerDay} server tasks reached. Sign in for more.`, code: "quota" }, { status: 429 });
  const maxMB = who.bigFiles ? tool.limits?.proMB ?? 500 : tool.limits?.freeMB ?? 50, max = maxMB * 1024 * 1024;
  const uploads = [];
  for (const f of files) {
    const ext = "." + (f.name ?? "").split(".").pop()?.toLowerCase();
    if (tool.accept && !tool.accept.includes(ext)) return NextResponse.json({ error: `Unsupported file type (${tool.accept.join(", ")})` }, { status: 400 });
    if (!f.size || f.size > max) return NextResponse.json({ error: `File too large (max ${maxMB} MB${who.bigFiles ? "" : " — upgrade for larger files"})`, code: "size" }, { status: 413 });
    const key = `${UPLOAD_PREFIX}${randomUUID()}`; // never use the user-supplied name as a key
    const url = await getSignedUrl(presignClient(), new PutObjectCommand({ Bucket: bucket(), Key: key, ContentLength: f.size }), { expiresIn: 600 });
    uploads.push({ key, url });
  }
  return NextResponse.json({ uploads });
}
