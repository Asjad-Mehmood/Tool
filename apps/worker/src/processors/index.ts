import path from "node:path";
import { readdir } from "node:fs/promises";
import sharp from "sharp";
import { assertType, run } from "../lib.js";

export interface Ctx {
  inputs: string[];
  dir: string;
  options: Record<string, string>;
  progress: (p: number) => Promise<void>;
}
export interface Out { file: string; name: string; contentType: string }
type Processor = (c: Ctx) => Promise<Out>;

const PDF = ["pdf"];
const OFFICE = ["docx", "xlsx", "pptx", "doc", "xls", "ppt", "cfb"]; // legacy formats are detected as "cfb"
const IMG = ["jpg", "png", "webp"];
const VIDEO = ["mp4", "mov", "webm", "mkv", "avi"];
const AUDIO = ["mp3", "wav", "aac", "ogg", "m4a", "flac", "mp4"];
const out = (dir: string, name: string) => path.join(dir, name);
const one = (c: Ctx) => { if (c.inputs.length !== 1) throw new Error("Exactly one file is required"); return c.inputs[0]; };

const gsQuality = new Set(["screen", "ebook", "printer"]);
const pick = (v: string | undefined, allowed: string[], fallback: string) => (v && allowed.includes(v) ? v : fallback);

async function soffice(c: Ctx, allowed: string[]): Promise<Out> {
  const f = one(c); await assertType(f, allowed);
  // Fresh profile per job; macros are not executed in headless conversion with a clean profile.
  await run("soffice", [`-env:UserInstallation=file://${c.dir}/lo-profile`, "--headless", "--norestore", "--convert-to", "pdf", "--outdir", c.dir, f]);
  const pdf = (await readdir(c.dir)).find((n) => n.endsWith(".pdf"));
  if (!pdf) throw new Error("Conversion produced no output");
  return { file: out(c.dir, pdf), name: "converted.pdf", contentType: "application/pdf" };
}

export const processors: Record<string, Processor> = {
  "compress-pdf": async (c) => {
    const f = one(c); await assertType(f, PDF);
    const o = out(c.dir, "out.pdf");
    await run("gs", ["-dSAFER", "-dBATCH", "-dNOPAUSE", "-dQUIET", "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.5", `-dPDFSETTINGS=/${pick(c.options.quality, [...gsQuality], "ebook")}`, `-sOutputFile=${o}`, f]);
    return { file: o, name: "compressed.pdf", contentType: "application/pdf" };
  },
  "protect-pdf": async (c) => {
    const f = one(c); await assertType(f, PDF);
    const pw = c.options.password ?? ""; if (pw.length < 1) throw new Error("Enter a password");
    const o = out(c.dir, "out.pdf");
    await run("qpdf", ["--encrypt", pw, pw, "256", "--", f, o]);
    return { file: o, name: "protected.pdf", contentType: "application/pdf" };
  },
  "unlock-pdf": async (c) => {
    const f = one(c); await assertType(f, PDF);
    const o = out(c.dir, "out.pdf");
    await run("qpdf", [`--password=${c.options.password ?? ""}`, "--decrypt", f, o]);
    return { file: o, name: "unlocked.pdf", contentType: "application/pdf" };
  },
  "repair-pdf": async (c) => {
    const f = one(c); await assertType(f, PDF);
    const o = out(c.dir, "out.pdf");
    try { await run("qpdf", [f, o]); } catch { await run("gs", ["-dSAFER", "-dBATCH", "-dNOPAUSE", "-dQUIET", "-sDEVICE=pdfwrite", `-sOutputFile=${o}`, f]); }
    return { file: o, name: "repaired.pdf", contentType: "application/pdf" };
  },
  "ocr-pdf": async (c) => {
    const f = one(c); await assertType(f, PDF);
    const o = out(c.dir, "out.pdf");
    await run("ocrmypdf", ["--skip-text", "-l", pick(c.options.lang, ["eng", "ara", "urd"], "eng"), f, o]);
    return { file: o, name: "searchable.pdf", contentType: "application/pdf" };
  },
  "word-to-pdf": (c) => soffice(c, ["docx", "doc", "cfb"]),
  "excel-to-pdf": (c) => soffice(c, ["xlsx", "xls", "cfb"]),
  "powerpoint-to-pdf": (c) => soffice(c, ["pptx", "ppt", "cfb"]),
  "remove-background": async (c) => {
    const f = one(c); await assertType(f, IMG);
    const o = out(c.dir, "out.png");
    await run("rembg", ["i", f, o]);
    return { file: o, name: "no-background.png", contentType: "image/png" };
  },
  "avif-convert": async (c) => {
    const f = one(c); await assertType(f, IMG);
    const o = out(c.dir, "out.avif");
    await sharp(f, { limitInputPixels: 100_000_000 }).rotate().avif({ quality: 55 }).toFile(o);
    return { file: o, name: "image.avif", contentType: "image/avif" };
  },
  "video-convert": async (c) => {
    const f = one(c); await assertType(f, VIDEO);
    const fmt = pick(c.options.format, ["mp4", "webm", "mkv", "mov", "avi"], "mp4"), o = out(c.dir, `out.${fmt}`);
    await run("ffmpeg", ["-protocol_whitelist", "file,pipe", "-i", f, "-y", "-threads", "2", o]);
    return { file: o, name: `video.${fmt}`, contentType: `video/${fmt}` };
  },
  "video-compress": async (c) => {
    const f = one(c); await assertType(f, VIDEO);
    const o = out(c.dir, "out.mp4");
    await run("ffmpeg", ["-protocol_whitelist", "file,pipe", "-i", f, "-y", "-c:v", "libx264", "-crf", "28", "-preset", "veryfast", "-c:a", "aac", "-b:a", "128k", "-threads", "2", o]);
    return { file: o, name: "compressed.mp4", contentType: "video/mp4" };
  },
  "audio-convert": async (c) => {
    const f = one(c); await assertType(f, AUDIO);
    const fmt = pick(c.options.format, ["mp3", "wav", "aac", "ogg", "m4a"], "mp3"), o = out(c.dir, `out.${fmt}`);
    await run("ffmpeg", ["-protocol_whitelist", "file,pipe", "-i", f, "-vn", "-y", o]);
    return { file: o, name: `audio.${fmt}`, contentType: `audio/${fmt}` };
  },
};
void OFFICE;

processors["grayscale-pdf"] = async (c) => {
  const f = one(c); await assertType(f, PDF);
  const o = out(c.dir, "out.pdf");
  await run("gs", ["-dSAFER", "-dBATCH", "-dNOPAUSE", "-dQUIET", "-sDEVICE=pdfwrite", "-sColorConversionStrategy=Gray", "-dProcessColorModel=/DeviceGray", `-sOutputFile=${o}`, f]);
  return { file: o, name: "grayscale.pdf", contentType: "application/pdf" };
};
