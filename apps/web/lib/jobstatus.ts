import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { bucket, type JobResult } from "@toolhub/server-common";
import { db } from "@/lib/db";
import { presignClient, queue } from "@/lib/jobs";

export interface JobView { http: number; body: Record<string, unknown> }

/** Shared by the website polling route and the public API. Also keeps the Job table in sync. */
export async function getJobStatus(id: string): Promise<JobView> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return { http: 404, body: { status: "expired" } };
  const job = await queue().getJob(id);
  if (!job) { await db.job.updateMany({ where: { id, status: { in: ["QUEUED", "PROCESSING"] } }, data: { status: "EXPIRED" } }); return { http: 404, body: { status: "expired" } }; }
  const state = await job.getState();
  if (state === "completed") {
    const r = job.returnvalue as JobResult;
    await db.job.updateMany({ where: { id, status: { not: "DONE" } }, data: { status: "DONE", outputName: r.outputName, durationMs: r.durationMs } });
    const downloadUrl = await getSignedUrl(presignClient(), new GetObjectCommand({ Bucket: bucket(), Key: r.outputKey, ResponseContentDisposition: `attachment; filename="${r.outputName}"` }), { expiresIn: 300 }); // short-lived
    return { http: 200, body: { status: "done", progress: 100, downloadUrl, name: r.outputName } };
  }
  if (state === "failed") { await db.job.updateMany({ where: { id, status: { not: "FAILED" } }, data: { status: "FAILED", error: (job.failedReason ?? "").slice(0, 300) } }); return { http: 200, body: { status: "failed", error: job.failedReason ?? "Processing failed" } }; }
  if (state === "active") await db.job.updateMany({ where: { id, status: "QUEUED" }, data: { status: "PROCESSING" } });
  return { http: 200, body: { status: state === "active" ? "processing" : "queued", progress: typeof job.progress === "number" ? job.progress : 0 } };
}
