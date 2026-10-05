import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { bucket, type JobResult } from "@toolhub/server-common";
import { db } from "@/lib/db";
import { presignClient, queue } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ status: "expired" }, { status: 404 });
  const job = await queue().getJob(id);
  if (!job) { await db.job.updateMany({ where: { id, status: { in: ["QUEUED", "PROCESSING"] } }, data: { status: "EXPIRED" } }); return NextResponse.json({ status: "expired" }, { status: 404 }); }
  const state = await job.getState();
  if (state === "completed") {
    const r = job.returnvalue as JobResult;
    await db.job.updateMany({ where: { id, status: { not: "DONE" } }, data: { status: "DONE", outputName: r.outputName, durationMs: r.durationMs } });
    const downloadUrl = await getSignedUrl(presignClient(), new GetObjectCommand({ Bucket: bucket(), Key: r.outputKey, ResponseContentDisposition: `attachment; filename="${r.outputName}"` }), { expiresIn: 300 }); // short-lived
    return NextResponse.json({ status: "done", progress: 100, downloadUrl, name: r.outputName });
  }
  if (state === "failed") { await db.job.updateMany({ where: { id, status: { not: "FAILED" } }, data: { status: "FAILED", error: (job.failedReason ?? "").slice(0, 300) } }); return NextResponse.json({ status: "failed", error: job.failedReason ?? "Processing failed" }); }
  if (state === "active") await db.job.updateMany({ where: { id, status: "QUEUED" }, data: { status: "PROCESSING" } });
  return NextResponse.json({ status: state === "active" ? "processing" : "queued", progress: typeof job.progress === "number" ? job.progress : 0 });
}
