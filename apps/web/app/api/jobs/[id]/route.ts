import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { JobResult } from "@toolhub/server-common";
import { bucket } from "@toolhub/server-common";
import { presignClient, queue } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const job = await queue().getJob((await params).id);
  if (!job) return NextResponse.json({ status: "expired" }, { status: 404 });
  const state = await job.getState();
  if (state === "completed") {
    const r = job.returnvalue as JobResult;
    const downloadUrl = await getSignedUrl(presignClient(), new GetObjectCommand({ Bucket: bucket(), Key: r.outputKey, ResponseContentDisposition: `attachment; filename="${r.outputName}"` }), { expiresIn: 300 }); // short-lived
    return NextResponse.json({ status: "done", progress: 100, downloadUrl, name: r.outputName });
  }
  if (state === "failed") return NextResponse.json({ status: "failed", error: job.failedReason ?? "Processing failed" });
  return NextResponse.json({ status: state === "active" ? "processing" : "queued", progress: typeof job.progress === "number" ? job.progress : 0 });
}
