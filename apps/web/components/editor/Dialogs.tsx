"use client";
import { useEffect, useRef, useState } from "react";
import { Num, Label } from "./Inspector";

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[90vh] w-full overflow-auto rounded-2xl bg-white p-5 shadow-2xl ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button className="btn-ghost !px-2 !py-1" onClick={onClose} aria-label="Close">✕</button></div>
        {children}
      </div>
    </div>
  );
}

/** Crop transparent margins from a canvas and return a PNG data URL. */
function trimCanvas(c: HTMLCanvasElement): string | null {
  const g = c.getContext("2d")!, d = g.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const pad = 6, o = document.createElement("canvas"); o.width = x1 - x0 + 1 + pad * 2; o.height = y1 - y0 + 1 + pad * 2;
  o.getContext("2d")!.drawImage(c, x0, y0, x1 - x0 + 1, y1 - y0 + 1, pad, pad, x1 - x0 + 1, y1 - y0 + 1);
  return o.toDataURL("image/png");
}

const SIG_FONTS = [{ label: "Script", css: "'Brush Script MT', 'Segoe Script', 'URW Chancery L', cursive" }, { label: "Formal", css: "'Snell Roundhand', 'Lucida Handwriting', 'Z003', cursive" }, { label: "Serif italic", css: "italic Georgia, 'Times New Roman', serif" }, { label: "Marker", css: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive" }];
const SIG_COLORS = ["#111111", "#1e3a8a", "#065f46", "#7f1d1d"];

export function SignatureDialog({ onClose, onDone }: { onClose: () => void; onDone: (dataUrl: string) => void }) {
  const [mode, setMode] = useState<"draw" | "type" | "upload">("draw"), [color, setColor] = useState("#111111"), [text, setText] = useState(""), [font, setFont] = useState(SIG_FONTS[0].css), [err, setErr] = useState("");
  const [img, setImg] = useState<HTMLImageElement | null>(null), [cut, setCut] = useState(true), [thick, setThick] = useState(3.5);
  const pad = useRef<HTMLCanvasElement>(null), drawing = useRef(false), last = useRef<{ x: number; y: number } | null>(null), prev = useRef<HTMLCanvasElement>(null);
  const pos = (e: React.PointerEvent) => { const r = pad.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) * pad.current!.width) / r.width, y: ((e.clientY - r.top) * pad.current!.height) / r.height }; };
  useEffect(() => { // live preview for the typed signature
    if (mode !== "type" || !prev.current) return; const c = prev.current, g = c.getContext("2d")!; g.clearRect(0, 0, c.width, c.height); g.fillStyle = color; g.font = `110px ${font}`; g.textBaseline = "middle"; g.fillText(text || "Your name", 24, c.height / 2);
  }, [mode, text, font, color]);
  useEffect(() => { // upload preview with optional background removal
    if (mode !== "upload" || !img || !prev.current) return; const c = prev.current, g = c.getContext("2d")!; const s = Math.min(c.width / img.width, c.height / img.height); c.width = img.width * s; c.height = img.height * s; g.clearRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    if (cut) { const d = g.getImageData(0, 0, c.width, c.height), a = d.data; for (let i = 0; i < a.length; i += 4) { const lum = 0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2]; if (lum > 225) a[i + 3] = 0; else if (lum > 170) a[i + 3] = Math.round(((225 - lum) / 55) * 255); } g.putImageData(d, 0, 0); }
  }, [mode, img, cut]);
  const done = () => {
    setErr("");
    const src = mode === "draw" ? pad.current : prev.current, url = src && trimCanvas(src);
    if (!url) return setErr(mode === "draw" ? "Draw your signature first." : mode === "type" ? "Type your name first." : "Choose an image first.");
    onDone(url);
  };
  return (
    <Modal title="Create your signature" onClose={onClose} wide>
      <div className="mb-3 flex gap-1">{(["draw", "type", "upload"] as const).map((m) => <button key={m} className={`btn-ghost flex-1 ${mode === m ? "!bg-indigo-600 !text-white" : ""}`} onClick={() => setMode(m)}>{m === "draw" ? "Draw" : m === "type" ? "Type" : "Upload image"}</button>)}</div>
      {mode !== "upload" && <div className="mb-3 flex items-center gap-2"><Label>Ink</Label>{SIG_COLORS.map((c) => <button key={c} aria-label={`Ink ${c}`} className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-indigo-500" : "border-white shadow"}`} style={{ background: c }} onClick={() => setColor(c)} />)}</div>}
      {mode === "draw" && (
        <div className="space-y-2">
          <canvas ref={pad} width={900} height={300} className="w-full touch-none rounded-lg border-2 border-dashed border-slate-300 bg-white" style={{ cursor: "crosshair" }}
            onPointerDown={(e) => { drawing.current = true; pad.current!.setPointerCapture(e.pointerId); last.current = pos(e); const g = pad.current!.getContext("2d")!; g.fillStyle = color; g.beginPath(); g.arc(last.current.x, last.current.y, thick / 2, 0, 7); g.fill(); }}
            onPointerMove={(e) => { if (!drawing.current || !last.current) return; const p = pos(e), g = pad.current!.getContext("2d")!; g.strokeStyle = color; g.lineWidth = thick * (1 - Math.min(0.45, Math.hypot(p.x - last.current.x, p.y - last.current.y) / 90)); g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(last.current.x, last.current.y); g.lineTo(p.x, p.y); g.stroke(); last.current = p; }}
            onPointerUp={() => { drawing.current = false; last.current = null; }} />
          <div className="flex items-center gap-3"><button className="btn-ghost" onClick={() => pad.current!.getContext("2d")!.clearRect(0, 0, 900, 300)}>Clear</button><div className="w-40"><Num label="Pen thickness" value={thick} min={1} max={10} step={0.5} onChange={setThick} /></div></div>
        </div>
      )}
      {mode === "type" && (
        <div className="space-y-2">
          <input className="input" placeholder="Type your name" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
          <div className="flex flex-wrap gap-1">{SIG_FONTS.map((f) => <button key={f.label} className={`btn-ghost ${font === f.css ? "!border-indigo-500 !bg-indigo-50" : ""}`} style={{ font: `20px ${f.css}` }} onClick={() => setFont(f.css)}>{text || "Signature"}</button>)}</div>
          <canvas ref={prev} width={900} height={190} className="w-full rounded-lg border border-slate-200 bg-white" />
        </div>
      )}
      {mode === "upload" && (
        <div className="space-y-2">
          <input type="file" accept="image/png,image/jpeg,image/webp" className="input" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const u = URL.createObjectURL(f), im = new Image(); im.onload = () => setImg(im); im.src = u; }} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cut} onChange={(e) => setCut(e.target.checked)} />Remove the white background (best for a photo of a signature on paper)</label>
          <canvas ref={prev} width={900} height={300} className="w-full rounded-lg border border-slate-200 bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:16px_16px]" />
        </div>
      )}
      {err && <p className="mt-2 text-sm text-red-600" role="alert">{err}</p>}
      <div className="mt-4 flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn" onClick={done}>Use signature</button></div>
    </Modal>
  );
}

export interface ExportDlgProps {
  onClose: () => void; baseName: string; totalPages: number; selectedCount: number; hasRedact: boolean; hasForm: boolean; flatten: boolean; setFlatten: (b: boolean) => void;
  run: (o: { name: string; scope: "all" | "current" | "selected"; permanentRedaction: boolean; optimize: boolean }) => Promise<void>;
  busy: string; result: { name: string; size: number; warnings: string[]; url: string } | null; error: string;
}
export function ExportDialog(p: ExportDlgProps) {
  const [name, setName] = useState(`${p.baseName}-edited`), [scope, setScope] = useState<"all" | "current" | "selected">("all"), [redact, setRedact] = useState(true), [opt, setOpt] = useState(true);
  return (
    <Modal title="Save PDF" onClose={p.onClose}>
      <div className="space-y-3 text-sm">
        <label className="block"><Label>File name</Label><span className="flex items-center gap-1"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /><span className="text-slate-500">.pdf</span></span></label>
        <div><Label>Pages</Label><div className="flex flex-wrap gap-3 text-xs">
          <label className="flex items-center gap-1"><input type="radio" checked={scope === "all"} onChange={() => setScope("all")} />All {p.totalPages}</label>
          <label className="flex items-center gap-1"><input type="radio" checked={scope === "current"} onChange={() => setScope("current")} />Current page</label>
          <label className="flex items-center gap-1"><input type="radio" disabled={!p.selectedCount} checked={scope === "selected"} onChange={() => setScope("selected")} />Selected ({p.selectedCount})</label></div></div>
        {p.hasForm && <label className="flex items-center gap-2"><input type="checkbox" checked={p.flatten} onChange={(e) => p.setFlatten(e.target.checked)} />Flatten form fields (answers become permanent)</label>}
        {p.hasRedact && <label className="flex items-center gap-2"><input type="checkbox" checked={redact} onChange={(e) => setRedact(e.target.checked)} />Permanently remove redacted content (pages with redactions become images)</label>}
        <label className="flex items-center gap-2"><input type="checkbox" checked={opt} onChange={(e) => setOpt(e.target.checked)} />Optimise file size</label>
        {p.busy && <p className="rounded-lg bg-indigo-50 p-2 text-indigo-800" role="status">{p.busy}</p>}
        {p.error && <p className="rounded-lg bg-red-50 p-2 text-red-700" role="alert">{p.error}</p>}
        {p.result && (
          <div className="space-y-2 rounded-lg bg-emerald-50 p-3 text-emerald-900" role="status">
            <p className="font-semibold">Saved — {(p.result.size / 1024).toFixed(0)} KB</p>
            {p.result.warnings.map((w, i) => <p key={i} className="text-xs text-amber-800">⚠ {w}</p>)}
            <a className="btn !bg-emerald-600" href={p.result.url} download={p.result.name}>Download {p.result.name}</a>
          </div>
        )}
        <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={p.onClose}>Close</button><button className="btn" disabled={Boolean(p.busy)} onClick={() => p.run({ name: name.trim() || "document", scope, permanentRedaction: redact, optimize: opt })}>{p.busy ? "Working…" : "Save PDF"}</button></div>
      </div>
    </Modal>
  );
}

export function HelpDialog({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [["V", "Select / move"], ["T", "Add text"], ["E", "Edit existing text"], ["H · U · K", "Highlight · underline · strikethrough"], ["P", "Pen"], ["R · O", "Rectangle · ellipse"], ["L · A", "Line · arrow"], ["W", "White-out"], ["X", "Redact"], ["G", "Signature"], ["N", "Comment note"], ["Ctrl/⌘ + Z · Y", "Undo · redo"], ["Ctrl/⌘ + C · V · X · D", "Copy · paste · cut · duplicate"], ["Delete", "Remove selection"], ["Arrow keys", "Nudge (Shift = 10 pt)"], ["Shift + drag", "Constrain angle / keep ratio"], ["Alt + drag", "Disable snapping"], ["Double-click text", "Edit its content"], ["Ctrl/⌘ + F", "Find & replace"], ["Ctrl/⌘ + S", "Save PDF"], ["+ / − / 0", "Zoom in / out / fit width"], ["Esc", "Deselect / back to Select"]];
  return <Modal title="Keyboard shortcuts" onClose={onClose} wide><div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">{rows.map(([k, d]) => <div key={k} className="flex justify-between gap-3 border-b border-slate-100 py-1"><kbd className="rounded border bg-slate-50 px-1.5 text-xs">{k}</kbd><span className="text-right text-slate-600">{d}</span></div>)}</div></Modal>;
}
