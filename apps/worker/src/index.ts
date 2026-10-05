import { randomUUID } from "node:crypto";
import { Worker, Queue } from "bullmq";
import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { FILE_TTL_SECONDS, OUTPUT_PREFIX, QUEUE_NAME, UPLOAD_PREFIX, bucket, redisConnection, safeName, type JobData, type JobResult } from "@toolhub/server-common";
import { download, makeWorkdir, s3, upload } from "./lib.js";
import { processors } from "./processors/index.js";

const worker = new Worker<JobData, JobResult>(
  QUEUE_NAME,
  async (job) => {
    const started = Date.now(), proc = processors[job.data.tool];
    if (!proc) throw new Error(`Unknown tool: ${job.data.tool}`);
    const wd = await makeWorkdir();
    try {
      await job.updateProgress(5);
      const inputs: string[] = [];
      for (const [i, key] of job.data.inputKeys.entries()) {
        if (!key.startsWith(UPLOAD_PREFIX) || key.includes("..")) throw new Error("Invalid input");
        inputs.push(await download(key, wd.dir, i));
      }
      await job.updateProgress(25);
      const r = await proc({ inputs, dir: wd.dir, options: job.data.options, progress: (p) => job.updateProgress(p) });
      const outputKey = `${OUTPUT_PREFIX}${randomUUID()}/${safeName(r.name)}`;
      await upload(r.file, outputKey, r.contentType);
      return { outputKey, outputName: safeName(r.name), durationMs: Date.now() - started };
    } finally { await wd.cleanup(); }
  },
  { connection: redisConnection(), concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2), lockDuration: 180_000 },
);
worker.on("failed", (job, err) => console.error(`job ${job?.id} (${job?.data.tool}) failed: ${err.message}`)); // never log file contents
worker.on("ready", () => console.log("worker ready"));

// Delete uploads/outputs older than FILE_TTL_SECONDS. Also set a bucket lifecycle rule as a backstop.
async function sweep() {
  const cutoff = Date.now() - FILE_TTL_SECONDS * 1000;
  for (const Prefix of [UPLOAD_PREFIX, OUTPUT_PREFIX]) {
    let token: string | undefined;
    do {
      const r = await s3.send(new ListObjectsV2Command({ Bucket: bucket(), Prefix, ContinuationToken: token }));
      const old = (r.Contents ?? []).filter((o) => o.Key && o.LastModified && o.LastModified.getTime() < cutoff).map((o) => ({ Key: o.Key! }));
      if (old.length) await s3.send(new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: old } }));
      token = r.NextContinuationToken;
    } while (token);
  }
}
setInterval(() => sweep().catch((e) => console.error("sweep failed", e.message)), 10 * 60 * 1000);
sweep().catch(() => {});

const queue = new Queue(QUEUE_NAME, { connection: redisConnection() });
void queue;
const stop = async () => { await worker.close(); process.exit(0); };
process.on("SIGTERM", stop); process.on("SIGINT", stop);
