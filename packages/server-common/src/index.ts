import { S3Client } from "@aws-sdk/client-s3";
import { Redis } from "ioredis";

export const QUEUE_NAME = "toolhub-jobs";
/** Uploaded inputs and outputs are deleted after this long. */
export const FILE_TTL_SECONDS = 60 * 60;
export const UPLOAD_PREFIX = "uploads/";
export const OUTPUT_PREFIX = "out/";

export interface JobData {
  tool: string;
  /** Object keys under UPLOAD_PREFIX, in the order the user supplied them. */
  inputKeys: string[];
  /** Original file names (display only — never used as paths). */
  inputNames: string[];
  options: Record<string, string>;
}
export interface JobResult { outputKey: string; outputName: string; durationMs: number }

export const bucket = () => process.env.S3_BUCKET ?? "toolhub";

export function s3Client(endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000") {
  return new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY ?? "minioadmin", secretAccessKey: process.env.S3_SECRET_KEY ?? "minioadmin" },
  });
}

export const redisConnection = () => new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });

/** Strip anything path-like from a user-supplied file name. */
export const safeName = (n: string) => n.replace(/[^\w.\- ]+/g, "_").replace(/^\.+/, "").slice(0, 100) || "file";
