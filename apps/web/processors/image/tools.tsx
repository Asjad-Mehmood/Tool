"use client";
import { useState, type ComponentType } from "react";
import { FileTool, Field, Num, Select, Stat, type Output } from "@/components/templates";

const base = (f: File) => f.name.replace(/\.[^.]+$/, "");
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const toBlob = (c: HTMLCanvasElement, type: string, q = 0.9) => new Promise<Blob>((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error(`Your browser can't encode ${type}`))), type, q));
async function draw(f: File | Blob, w?: number, h?: number, bg?: string) {
  const bmp = await createImageBitmap(f, { imageOrientation: "from-image" }), c = document.createElement("canvas");
  c.width = w ?? bmp.width; c.height = h ?? bmp.height;
  const ctx = c.getContext("2d")!; if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.drawImage(bmp, 0, 0, c.width, c.height); return { c, w: bmp.width, h: bmp.height };
}
const ACCEPT = ".jpg,.jpeg,.png,.webp,image/*";

function Compress() {
  const [q, setQ] = useState("0.7"), [max, setMax] = useState("2000");
  return <FileTool accept={ACCEPT} multiple actionLabel="Compress" extra={<div className="grid gap-3 sm:grid-cols-2"><Field label={`Quality: ${Math.round(+q * 100)}%`}><input type="range" min={0.1} max={1} step={0.05} value={q} onChange={(e) => setQ(e.target.value)} className="w-full" /></Field><Num label="Max width/height (px)" value={max} onChange={setMax} /></div>}
    run={async (files) => Promise.all(files.map(async (f): Promise<Output> => {
      const bmp = await createImageBitmap(f), s = Math.min(1, (+max || 99999) / Math.max(bmp.width, bmp.height));
      const { c } = await draw(f, Math.round(bmp.width * s), Math.round(bmp.height * s), "#fff");
      const type = f.type === "image/png" || f.type === "image/webp" ? "image/webp" : "image/jpeg", blob = await toBlob(c, type, +q);
      return blob.size < f.size ? { blob, name: `${base(f)}-compressed.${EXT[type]}` } : { blob: f, name: f.name };
    }))} />;
}

function Resize() {
  const [w, setW] = useState("800"), [h, setH] = useState(""), [fmt, setFmt] = useState("image/jpeg");
  return <FileTool accept={ACCEPT} multiple actionLabel="Resize" extra={<div className="grid gap-3 sm:grid-cols-3"><Num label="Width (px)" value={w} onChange={setW} /><Num label="Height (px, blank = keep ratio)" value={h} onChange={setH} /><Select label="Output" value={fmt} onChange={setFmt} options={Object.keys(EXT)} /></div>}
    run={async (files) => Promise.all(files.map(async (f) => {
      const bmp = await createImageBitmap(f); let W = +w || 0, H = +h || 0;
      if (!W && !H) throw new Error("Enter a width or height"); if (!H) H = Math.round((bmp.height * W) / bmp.width); if (!W) W = Math.round((bmp.width * H) / bmp.height);
      const { c } = await draw(f, W, H, fmt === "image/jpeg" ? "#fff" : undefined);
      return { blob: await toBlob(c, fmt), name: `${base(f)}-${W}x${H}.${EXT[fmt]}` };
    }))} />;
}

function Crop() {
  const [v, setV] = useState({ x: "0", y: "0", w: "500", h: "500" });
  const s = (k: keyof typeof v) => (x: string) => setV({ ...v, [k]: x });
  return <FileTool accept={ACCEPT} actionLabel="Crop" extra={<div className="grid gap-3 sm:grid-cols-4"><Num label="Left (x)" value={v.x} onChange={s("x")} /><Num label="Top (y)" value={v.y} onChange={s("y")} /><Num label="Width" value={v.w} onChange={s("w")} /><Num label="Height" value={v.h} onChange={s("h")} /></div>}
    run={async ([f]) => {
      const { c: full } = await draw(f), [x, y, w, h] = [+v.x, +v.y, +v.w, +v.h];
      if (!(w > 0 && h > 0) || x < 0 || y < 0 || x + w > full.width || y + h > full.height) throw new Error(`Crop area must fit inside the ${full.width}×${full.height} image`);
      const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d")!.drawImage(full, x, y, w, h, 0, 0, w, h);
      const type = f.type === "image/jpeg" ? "image/jpeg" : "image/png"; return { blob: await toBlob(c, type, 0.92), name: `${base(f)}-cropped.${EXT[type]}` };
    }} />;
}

function RotateFlip() {
  const [op, setOp] = useState("90");
  return <FileTool accept={ACCEPT} multiple actionLabel="Apply" extra={<Select label="Action" value={op} onChange={setOp} options={[{ value: "90", label: "Rotate 90° clockwise" }, { value: "180", label: "Rotate 180°" }, { value: "270", label: "Rotate 90° counter-clockwise" }, { value: "h", label: "Flip horizontal" }, { value: "v", label: "Flip vertical" }]} />}
    run={async (files) => Promise.all(files.map(async (f) => {
      const { c: src } = await draw(f), swap = op === "90" || op === "270", c = document.createElement("canvas");
      c.width = swap ? src.height : src.width; c.height = swap ? src.width : src.height;
      const ctx = c.getContext("2d")!; ctx.translate(c.width / 2, c.height / 2);
      if (op === "h") ctx.scale(-1, 1); else if (op === "v") ctx.scale(1, -1); else ctx.rotate((+op * Math.PI) / 180);
      ctx.drawImage(src, -src.width / 2, -src.height / 2);
      const type = f.type === "image/jpeg" ? "image/jpeg" : "image/png"; return { blob: await toBlob(c, type, 0.95), name: `${base(f)}-edited.${EXT[type]}` };
    }))} />;
}

function Convert() {
  const [fmt, setFmt] = useState("image/png"), [q, setQ] = useState("0.9");
  return <FileTool accept={ACCEPT} multiple actionLabel="Convert" extra={<div className="grid gap-3 sm:grid-cols-2"><Select label="Convert to" value={fmt} onChange={setFmt} options={[{ value: "image/jpeg", label: "JPG" }, { value: "image/png", label: "PNG" }, { value: "image/webp", label: "WEBP" }]} /><Num label="Quality (0.1–1, JPG/WEBP)" value={q} onChange={setQ} /></div>}
    run={async (files) => Promise.all(files.map(async (f) => { const { c } = await draw(f, undefined, undefined, fmt === "image/jpeg" ? "#fff" : undefined); return { blob: await toBlob(c, fmt, +q), name: `${base(f)}.${EXT[fmt]}` }; }))} />;
}

function HeicToJpg() {
  return <FileTool accept=".heic,.heif,image/heic,image/heif" multiple actionLabel="Convert to JPG"
    run={async (files, progress) => {
      const heic2any = (await import("heic2any")).default, outs: Output[] = [];
      for (const [i, f] of files.entries()) { progress(`${i + 1} of ${files.length}`); const r = await heic2any({ blob: f, toType: "image/jpeg", quality: 0.92 }); outs.push({ blob: Array.isArray(r) ? r[0] : r, name: `${base(f)}.jpg` }); }
      return outs;
    }} />;
}

function ExifRemover() {
  const [info, setInfo] = useState<Record<string, unknown> | null>(null);
  return <FileTool accept={ACCEPT} multiple actionLabel="Remove metadata & download"
    extra={<div className="space-y-2"><input type="file" accept={ACCEPT} className="input" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const exifr = (await import("exifr")).default; setInfo((await exifr.parse(f, true).catch(() => null)) ?? {}); }} />
      <p className="text-xs text-slate-500">Optional: choose a file above to view its metadata. Then add files below to strip it.</p>
      {info && (Object.keys(info).length ? <div className="card max-h-64 overflow-auto text-xs"><table><tbody>{Object.entries(info).slice(0, 80).map(([k, v]) => <tr key={k}><td className="pr-3 font-medium">{k}</td><td className="break-all">{typeof v === "object" ? JSON.stringify(v).slice(0, 120) : String(v)}</td></tr>)}</tbody></table></div> : <Stat label="Metadata" value="None found" />)}</div>}
    run={async (files) => Promise.all(files.map(async (f) => { const { c } = await draw(f, undefined, undefined, "#fff"), type = f.type === "image/png" ? "image/png" : "image/jpeg"; return { blob: await toBlob(c, type, 0.95), name: `${base(f)}-clean.${EXT[type]}` }; }))} />;
}

export const tools: Record<string, ComponentType> = {
  "compress-image": Compress, "resize-image": Resize, "crop-image": Crop, "rotate-image": RotateFlip, "convert-image": Convert, "heic-to-jpg": HeicToJpg, "exif-remover": ExifRemover,
};
