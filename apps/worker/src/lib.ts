import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { tmpdir } from "node:os";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { fileTypeFromFile } from "file-type";
import { bucket, s3Client } from "@toolhub/server-common";

const pExec = promisify(execFile);
export const s3 = s3Client();

export const JOB_TIMEOUT_MS = Number(process.env.JOB_TIMEOUT_MS ?? 120_000);
export const MAX_INPUT_BYTES = Number(process.env.MAX_INPUT_MB ?? 500) * 1024 * 1024;

/** Run a binary with an argument array — never through a shell (prevents command injection). */
export async function run(cmd: string, args: string[], opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  try {
    return await pExec(cmd, args, { timeout: JOB_TIMEOUT_MS, killSignal: "SIGKILL", maxBuffer: 10 * 1024 * 1024, cwd: opts.cwd, env: { PATH: process.env.PATH, HOME: "/tmp", LANG: "C.UTF-8", ...opts.env } });
  } catch (e) {
    const err = e as { killed?: boolean; stderr?: string; code?: string };
    if (err.killed) throw new Error("Processing took too long and was stopped");
    if (err.code === "ENOENT") throw new Error(`${cmd} is not installed on this worker`);
    throw new Error(`${cmd} failed: ${(err.stderr ?? "").trim().split("\n").slice(-3).join(" ").slice(0, 300) || "unknown error"}`);
  }
}

export interface Workdir { dir: string; cleanup: () => Promise<void> }
export async function makeWorkdir(): Promise<Workdir> {
  const dir = await mkdtemp(path.join(tmpdir(), "job-"));
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

export async function download(key: string, dir: string, index: number): Promise<string> {
  // Local file name is generated, never derived from user input.
  const dest = path.join(dir, `in-${index}`);
  const r = await s3.send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!r.Body) throw new Error("Input file is missing or expired");
  if ((r.ContentLength ?? 0) > MAX_INPUT_BYTES) throw new Error("File too large");
  await pipeline(r.Body as Readable, createWriteStream(dest));
  return dest;
}

export async function upload(file: string, key: string, contentType: string) {
  const { size } = await stat(file);
  await s3.send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: createReadStream(file), ContentLength: size, ContentType: contentType }));
}

/** Verify the real content type from magic bytes — never trust the extension. */
export async function assertType(file: string, allowed: string[]) {
  const t = await fileTypeFromFile(file);
  const ok = t ? allowed.includes(t.ext) : allowed.includes("text"); // plain text has no magic bytes
  if (!ok) throw new Error(`Unsupported file type${t ? ` (${t.ext})` : ""}`);
}
