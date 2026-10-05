import { Queue } from "bullmq";
import { S3Client } from "@aws-sdk/client-s3";
import { QUEUE_NAME, redisConnection, s3Client } from "@toolhub/server-common";

const g = globalThis as unknown as { __queue?: Queue; __s3?: S3Client };
export const queue = () => (g.__queue ??= new Queue(QUEUE_NAME, { connection: redisConnection(), defaultJobOptions: { attempts: 1, removeOnComplete: { age: 3600 }, removeOnFail: { age: 3600 } } }));
/** Client used to sign URLs for the *browser*, so it points at the publicly reachable endpoint. */
export const presignClient = () => (g.__s3 ??= s3Client(process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT ?? "http://localhost:9000"));
