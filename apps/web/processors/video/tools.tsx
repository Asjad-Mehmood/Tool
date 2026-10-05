"use client";
import { useState, type ComponentType } from "react";
import { FileTool, Num, Select, type Output } from "@/components/templates";

// ffmpeg.wasm runs fully in the browser. Core is fetched from a CDN on first use (~30 MB).
const CORE = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
const base = (f: File) => f.name.replace(/\.[^.]+$/, "");

async function ffmpegRun(file: File, args: string[], outName: string, mime: string, progress: (m: string) => void): Promise<Output> {
  const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
  const ff = new FFmpeg();
  ff.on("progress", ({ progress: p }) => progress(`${Math.round(Math.min(1, Math.max(0, p)) * 100)}%`));
  progress("Loading video engine…");
  await ff.load({ coreURL: await toBlobURL(`${CORE}/ffmpeg-core.js`, "text/javascript"), wasmURL: await toBlobURL(`${CORE}/ffmpeg-core.wasm`, "application/wasm") });
  const ext = file.name.split(".").pop() ?? "mp4", input = `in.${ext}`;
  await ff.writeFile(input, await fetchFile(file));
  const code = await ff.exec(["-i", input, ...args, outName]);
  if (code !== 0) throw new Error("Could not process this file");
  const data = (await ff.readFile(outName)) as Uint8Array;
  ff.terminate();
  return { blob: new Blob([data as BlobPart], { type: mime }), name: `${base(file)}-${outName}` };
}
const ACC = ".mp4,.mov,.webm,.mkv,video/*";

function Trim() {
  const [s, setS] = useState("0"), [e, setE] = useState("10");
  return <FileTool accept={ACC} actionLabel="Trim" extra={<div className="grid gap-3 sm:grid-cols-2"><Num label="Start (seconds)" value={s} onChange={setS} /><Num label="End (seconds)" value={e} onChange={setE} /></div>}
    run={async ([f], p) => { if (!(+e > +s)) throw new Error("End must be after start"); return ffmpegRun(f, ["-ss", s, "-to", e, "-c:v", "libx264", "-c:a", "aac", "-preset", "ultrafast"], "trimmed.mp4", "video/mp4", p); }} />;
}
function ToGif() {
  const [s, setS] = useState("0"), [d, setD] = useState("5"), [w, setW] = useState("480"), [fps, setFps] = useState("12");
  return <FileTool accept={ACC} actionLabel="Make GIF" extra={<div className="grid gap-3 sm:grid-cols-4"><Num label="Start (s)" value={s} onChange={setS} /><Num label="Duration (s)" value={d} onChange={setD} /><Num label="Width (px)" value={w} onChange={setW} /><Num label="FPS" value={fps} onChange={setFps} /></div>}
    run={async ([f], p) => ffmpegRun(f, ["-ss", s, "-t", d, "-vf", `fps=${+fps || 12},scale=${+w || 480}:-1:flags=lanczos`, "-loop", "0"], "clip.gif", "image/gif", p)} />;
}
function ExtractAudio() {
  const [fmt, setFmt] = useState("mp3");
  return <FileTool accept={ACC} actionLabel="Extract audio" extra={<Select label="Format" value={fmt} onChange={setFmt} options={["mp3", "wav", "m4a"]} />}
    run={async ([f], p) => ffmpegRun(f, ["-vn", ...(fmt === "mp3" ? ["-c:a", "libmp3lame", "-q:a", "2"] : fmt === "m4a" ? ["-c:a", "aac"] : [])], `audio.${fmt}`, `audio/${fmt}`, p)} />;
}
export const tools: Record<string, ComponentType> = { "video-trim": Trim, "video-to-gif": ToGif, "extract-audio": ExtractAudio };
