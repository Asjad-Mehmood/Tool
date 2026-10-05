"use client";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { diffLines } from "diff";
import { FileTool, Field, Num, Select, Stat, download, type Output } from "@/components/templates";
import { extractPages, getPdfjs } from "@/lib/pdfjs";
import { base, load, pdfBlob } from "./tools";

const PDF = ".pdf,application/pdf";

function PdfToText() {
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <FileTool accept={PDF} actionLabel="Extract text" run={async ([f], progress) => {
        const pages = await extractPages(f, (n, t) => progress(`Page ${n} of ${t}`));
        const out = pages.map((p, i) => `--- Page ${i + 1} ---\n${p}`).join("\n\n");
        setText(out);
        if (!out.replace(/--- Page \d+ ---/g, "").trim()) throw new Error("No text found — this looks like a scanned PDF. Try OCR PDF first.");
        return { blob: new Blob([out], { type: "text/plain" }), name: `${base(f)}.txt` };
      }} />
      {text && <textarea className="input h-72 font-mono" readOnly value={text} />}
    </div>
  );
}

const WIN_ANSI = /[^ -~ -ÿ\n\t]/g;
function TextToPdf() {
  const [text, setText] = useState(""), [size, setSize] = useState("11"), [page, setPage] = useState("a4");
  return (
    <FileTool noFiles actionLabel="Create PDF"
      extra={<div className="space-y-3">
        <Field label="Your text"><textarea className="input h-56" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or paste text, or load a .txt file below" /></Field>
        <input type="file" accept=".txt,text/plain" className="input" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); }} />
        <div className="grid gap-3 sm:grid-cols-2"><Num label="Font size" value={size} onChange={setSize} /><Select label="Page size" value={page} onChange={setPage} options={[{ value: "a4", label: "A4" }, { value: "letter", label: "US Letter" }]} /></div>
        <p className="text-xs text-slate-500">Standard PDF fonts only cover Latin characters; other scripts are replaced with “?”.</p></div>}
      run={async () => {
        if (!text.trim()) throw new Error("Enter some text first");
        const { PDFDocument, StandardFonts } = await import("pdf-lib"), doc = await PDFDocument.create(), font = await doc.embedFont(StandardFonts.Helvetica);
        const [W, H] = page === "a4" ? [595.28, 841.89] : [612, 792], fs = Math.min(Math.max(+size || 11, 6), 36), lh = fs * 1.35, m = 56, maxW = W - m * 2;
        const lines: string[] = [];
        for (const raw of text.replace(/\r/g, "").replace(/\t/g, "    ").replace(WIN_ANSI, "?").split("\n")) {
          let cur = "";
          for (const word of raw.split(" ")) {
            const t = cur ? cur + " " + word : word;
            if (font.widthOfTextAtSize(t, fs) <= maxW) { cur = t; continue; }
            if (cur) lines.push(cur);
            let w = word; while (font.widthOfTextAtSize(w, fs) > maxW) { let k = w.length - 1; while (k > 1 && font.widthOfTextAtSize(w.slice(0, k), fs) > maxW) k--; lines.push(w.slice(0, k)); w = w.slice(k); }
            cur = w;
          }
          lines.push(cur);
        }
        let p = doc.addPage([W, H]), y = H - m;
        for (const l of lines) { if (y < m) { p = doc.addPage([W, H]); y = H - m; } p.drawText(l, { x: m, y, size: fs, font }); y -= lh; }
        return { blob: pdfBlob(await doc.save()), name: "text.pdf" };
      }} />
  );
}

function Metadata() {
  const [m, setM] = useState({ title: "", author: "", subject: "", keywords: "", creator: "", producer: "" });
  const set = (k: keyof typeof m) => (v: string) => setM((x) => ({ ...x, [k]: v }));
  const T = (k: keyof typeof m, label: string) => <Field label={label}><input className="input" value={m[k]} onChange={(e) => set(k)(e.target.value)} /></Field>;
  return (
    <FileTool accept={PDF} actionLabel="Save metadata"
      onFiles={async ([f]) => { if (!f) return; try { const { src } = await load(f); setM({ title: src.getTitle() ?? "", author: src.getAuthor() ?? "", subject: src.getSubject() ?? "", keywords: src.getKeywords() ?? "", creator: src.getCreator() ?? "", producer: src.getProducer() ?? "" }); } catch { /* encrypted / unreadable — fields stay empty */ } }}
      extra={<div className="grid gap-3 sm:grid-cols-2">{T("title", "Title")}{T("author", "Author")}{T("subject", "Subject")}{T("keywords", "Keywords (comma separated)")}{T("creator", "Creator")}{T("producer", "Producer")}</div>}
      run={async ([f]) => {
        const { PDFDocument } = await import("pdf-lib"), src = await PDFDocument.load(await f.arrayBuffer(), { updateMetadata: false });
        src.setTitle(m.title); src.setAuthor(m.author); src.setSubject(m.subject); src.setKeywords(m.keywords.split(",").map((s) => s.trim()).filter(Boolean)); src.setCreator(m.creator); src.setProducer(m.producer);
        return { blob: pdfBlob(await src.save()), name: `${base(f)}-metadata.pdf` };
      }} />
  );
}

function Crop() {
  const [mm, setMm] = useState({ top: "10", right: "10", bottom: "10", left: "10" });
  const set = (k: keyof typeof mm) => (v: string) => setMm((x) => ({ ...x, [k]: v }));
  return (
    <FileTool accept={PDF} actionLabel="Crop PDF"
      extra={<div className="space-y-2"><div className="grid gap-3 sm:grid-cols-4"><Num label="Top (mm)" value={mm.top} onChange={set("top")} /><Num label="Right (mm)" value={mm.right} onChange={set("right")} /><Num label="Bottom (mm)" value={mm.bottom} onChange={set("bottom")} /><Num label="Left (mm)" value={mm.left} onChange={set("left")} /></div><p className="text-xs text-slate-500">Trims the visible page area on every page. Content outside the new area is hidden, not deleted.</p></div>}
      run={async ([f]) => {
        const { src } = await load(f), k = 2.83465, [t, r, b, l] = [+mm.top, +mm.right, +mm.bottom, +mm.left].map((v) => Math.max(0, v || 0) * k);
        for (const p of src.getPages()) {
          const box = p.getMediaBox(), w = box.width - l - r, h = box.height - t - b;
          if (w < 20 || h < 20) throw new Error("Margins are too large for this page size");
          p.setCropBox(box.x + l, box.y + b, w, h);
        }
        return { blob: pdfBlob(await src.save()), name: `${base(f)}-cropped.pdf` };
      }} />
  );
}

function Flatten() {
  return <FileTool accept={PDF} actionLabel="Flatten PDF" run={async ([f]) => {
    const { src } = await load(f), form = src.getForm(), n = form.getFields().length;
    if (!n) throw new Error("This PDF has no fillable form fields to flatten");
    form.flatten();
    return { blob: pdfBlob(await src.save()), name: `${base(f)}-flattened.pdf` };
  }} />;
}

/* ---------- Sign ---------- */
function Sign() {
  const [file, setFile] = useState<File>(), [pages, setPages] = useState(1), [pageNo, setPageNo] = useState(1), [preview, setPreview] = useState<{ url: string; w: number; h: number }>();
  const [mode, setMode] = useState("draw"), [typed, setTyped] = useState(""), [font, setFont] = useState("'Brush Script MT', 'Segoe Script', cursive"), [sig, setSig] = useState<string>();
  const [pos, setPos] = useState({ x: 0.7, y: 0.85 }), [width, setWidth] = useState(25), [err, setErr] = useState(""), [out, setOut] = useState<Output>(), [busy, setBusy] = useState(false);
  const pad = useRef<HTMLCanvasElement>(null), drawing = useRef(false);

  useEffect(() => { // render the selected page as a preview
    if (!file) return; let live = true;
    (async () => {
      try {
        const pdfjs = await getPdfjs(), doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise; setPages(doc.numPages);
        const page = await doc.getPage(Math.min(pageNo, doc.numPages)), vp = page.getViewport({ scale: 1 }), s = Math.min(1.2, 640 / vp.width), v = page.getViewport({ scale: s }), c = document.createElement("canvas");
        c.width = v.width; c.height = v.height; await page.render({ canvasContext: c.getContext("2d")!, viewport: v, canvas: c }).promise;
        if (live) { setPreview({ url: c.toDataURL("image/jpeg", 0.85), w: v.width, h: v.height }); setErr(page.rotate ? "This page is rotated — use Rotate PDF first so the signature lands correctly." : ""); }
      } catch { if (live) setErr("Could not open this PDF"); }
    })();
    return () => { live = false; };
  }, [file, pageNo]);

  const trim = (c: HTMLCanvasElement) => { // crop transparent margins
    const ctx = c.getContext("2d")!, d = ctx.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 10) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    if (x1 <= x0) return null; const o = document.createElement("canvas"); o.width = x1 - x0 + 8; o.height = y1 - y0 + 8; o.getContext("2d")!.drawImage(c, x0 - 4, y0 - 4, o.width, o.height, 0, 0, o.width, o.height); return o.toDataURL("image/png");
  };
  const useDrawn = () => { const u = pad.current && trim(pad.current); u ? setSig(u) : setErr("Draw your signature first"); };
  const useTyped = () => { if (!typed.trim()) return setErr("Type your name first"); const c = document.createElement("canvas"); c.width = 900; c.height = 220; const ctx = c.getContext("2d")!; ctx.fillStyle = "#111"; ctx.font = `120px ${font}`; ctx.textBaseline = "middle"; ctx.fillText(typed, 20, 110); const u = trim(c); u && setSig(u); };
  const pt = (e: React.PointerEvent) => { const r = pad.current!.getBoundingClientRect(); return [((e.clientX - r.left) * pad.current!.width) / r.width, ((e.clientY - r.top) * pad.current!.height) / r.height]; };

  const apply = async () => {
    if (!file || !sig || !preview) return; setBusy(true); setErr("");
    try {
      const { src } = await load(file), page = src.getPage(Math.min(pageNo, pages) - 1), { width: pw, height: ph } = page.getSize(), img = await src.embedPng(await (await fetch(sig)).arrayBuffer());
      const w = (width / 100) * pw, h = (img.height / img.width) * w;
      page.drawImage(img, { x: pos.x * pw - w / 2, y: ph - pos.y * ph - h / 2, width: w, height: h });
      setOut({ blob: pdfBlob(await src.save()), name: `${base(file)}-signed.pdf` });
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      <input type="file" accept={PDF} className="input" onChange={(e) => { setFile(e.target.files?.[0]); setOut(undefined); setPageNo(1); }} />
      {file && (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            <div className="flex gap-2">{["draw", "type"].map((m) => <button key={m} className={`btn-ghost ${mode === m ? "!border-indigo-500 !bg-indigo-50" : ""}`} onClick={() => setMode(m)}>{m === "draw" ? "Draw" : "Type"}</button>)}</div>
            {mode === "draw" ? (
              <div className="space-y-2">
                <canvas ref={pad} width={600} height={220} className="w-full touch-none rounded-lg border border-slate-300 bg-white" style={{ cursor: "crosshair" }}
                  onPointerDown={(e) => { drawing.current = true; pad.current!.setPointerCapture(e.pointerId); const ctx = pad.current!.getContext("2d")!, [x, y] = pt(e); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111"; }}
                  onPointerMove={(e) => { if (!drawing.current) return; const ctx = pad.current!.getContext("2d")!, [x, y] = pt(e); ctx.lineTo(x, y); ctx.stroke(); }}
                  onPointerUp={() => { drawing.current = false; }} />
                <div className="flex gap-2"><button className="btn-ghost" onClick={() => { pad.current!.getContext("2d")!.clearRect(0, 0, 600, 220); setSig(undefined); }}>Clear</button><button className="btn" onClick={useDrawn}>Use this signature</button></div>
              </div>
            ) : (
              <div className="space-y-2">
                <input className="input" placeholder="Your name" value={typed} onChange={(e) => setTyped(e.target.value)} />
                <Select label="Style" value={font} onChange={setFont} options={[{ value: "'Brush Script MT', 'Segoe Script', cursive", label: "Script" }, { value: "'Snell Roundhand', 'Lucida Handwriting', cursive", label: "Formal" }, { value: "Georgia, serif", label: "Serif" }]} />
                <button className="btn" onClick={useTyped}>Use this signature</button>
              </div>
            )}
            {sig && <div className="card"><p className="mb-1 text-xs text-slate-500">Your signature</p><img src={sig} alt="Signature" className="max-h-16 bg-white" /></div>}
            <div className="grid grid-cols-2 gap-3"><Num label={`Page (1–${pages})`} value={String(pageNo)} onChange={(v) => setPageNo(Math.min(Math.max(+v || 1, 1), pages))} /><Field label={`Size: ${width}%`}><input type="range" min={8} max={60} value={width} onChange={(e) => setWidth(+e.target.value)} className="w-full" /></Field></div>
          </div>
          <div>
            <p className="mb-2 text-sm text-slate-500">Click the page to place your signature.</p>
            {preview && (
              <div className="relative inline-block max-w-full cursor-crosshair overflow-hidden rounded-lg border border-slate-300" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPos({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }); }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.url} alt="Page preview" className="block max-w-full" />
                {sig && <img src={sig} alt="" className="pointer-events-none absolute" style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, width: `${width}%`, transform: "translate(-50%, -50%)", outline: "1px dashed #6366f1" }} />}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={!file || !sig || busy} onClick={apply}>{busy ? "Signing…" : "Sign PDF"}</button>
        {out && <button className="btn !bg-emerald-600" onClick={() => download(out.blob, out.name)}>Download {out.name}</button>}
        {err && <span className="text-sm text-amber-700">{err}</span>}
      </div>
    </div>
  );
}

/* ---------- Compare ---------- */
function Compare() {
  const [a, setA] = useState<File>(), [b, setB] = useState<File>(), [busy, setBusy] = useState(false), [err, setErr] = useState(""), [res, setRes] = useState<{ parts: ReturnType<typeof diffLines>; added: number; removed: number; pa: number; pb: number }>();
  const run = async () => {
    if (!a || !b) return; setBusy(true); setErr(""); setRes(undefined);
    try {
      const [ta, tb] = await Promise.all([extractPages(a), extractPages(b)]), join = (p: string[]) => p.map((t, i) => `[Page ${i + 1}]\n${t}`).join("\n");
      if (!ta.join("").trim() && !tb.join("").trim()) throw new Error("No text found in either file (scanned PDFs need OCR first)");
      const parts = diffLines(join(ta), join(tb)); setRes({ parts, added: parts.filter((p) => p.added).reduce((n, p) => n + (p.count ?? 0), 0), removed: parts.filter((p) => p.removed).reduce((n, p) => n + (p.count ?? 0), 0), pa: ta.length, pb: tb.length });
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Original PDF"><input type="file" accept={PDF} className="input" onChange={(e) => setA(e.target.files?.[0])} /></Field><Field label="Changed PDF"><input type="file" accept={PDF} className="input" onChange={(e) => setB(e.target.files?.[0])} /></Field></div>
      <button className="btn" disabled={!a || !b || busy} onClick={run}>{busy ? "Comparing…" : "Compare"}</button>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {res && <>
        <div className="grid gap-2 sm:grid-cols-4"><Stat label="Pages (original → changed)" value={`${res.pa} → ${res.pb}`} /><Stat label="Lines added" value={res.added} /><Stat label="Lines removed" value={res.removed} /><Stat label="Verdict" value={res.added + res.removed ? "Differences found" : "Text is identical"} /></div>
        <pre className="card max-h-[32rem] overflow-auto whitespace-pre-wrap text-sm">{res.parts.map((p, i) => <span key={i} className={p.added ? "bg-emerald-200 text-emerald-950" : p.removed ? "bg-red-200 text-red-950 line-through" : "text-slate-500"}>{p.value}</span>)}</pre>
        <p className="text-xs text-slate-500">Compares extracted text only; layout and image changes aren’t detected.</p></>}
    </div>
  );
}

/* ---------- Redact ---------- */
function Redact() {
  const [terms, setTerms] = useState("");
  return (
    <FileTool accept={PDF} actionLabel="Redact permanently"
      extra={<div className="space-y-2"><Field label="Words or phrases to black out (one per line, not case-sensitive)"><textarea className="input h-28" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder={"John Smith\n555-0100\nconfidential"} /></Field>
        <p className="text-xs text-slate-500">Pages with matches are re-rendered as images, so the hidden text is gone for good. Check the result before sharing.</p></div>}
      run={async ([f], progress) => {
        const list = terms.split("\n").map((t) => t.trim().toLowerCase()).filter(Boolean);
        if (!list.length) throw new Error("Enter at least one word or phrase");
        const pdfjs = await getPdfjs(), buf = await f.arrayBuffer(), doc = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
        const { PDFDocument } = await import("pdf-lib"), src = await PDFDocument.load(buf), out = await PDFDocument.create(), S = 2;
        let total = 0;
        for (let i = 1; i <= doc.numPages; i++) {
          progress(`Page ${i} of ${doc.numPages}`);
          const page = await doc.getPage(i), tc = await page.getTextContent(), vp1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: S });
          type Seg = { start: number; end: number; x: number; y: number; w: number; h: number; len: number };
          let full = ""; const segs: Seg[] = [];
          for (const it of tc.items) { if (!("str" in it) || !it.str) continue; if (full && !full.endsWith(" ")) full += " "; segs.push({ start: full.length, end: full.length + it.str.length, x: it.transform[4], y: it.transform[5], w: it.width, h: it.height || Math.abs(it.transform[3]), len: it.str.length }); full += it.str; }
          const lower = full.toLowerCase(), rects: number[][] = [];
          for (const t of list) for (let at = lower.indexOf(t); at !== -1; at = lower.indexOf(t, at + t.length)) {
            total++; const mEnd = at + t.length;
            for (const s of segs) { const a = Math.max(at, s.start), e = Math.min(mEnd, s.end); if (e <= a) continue; const f0 = (a - s.start) / s.len, f1 = (e - s.start) / s.len, pad = 1.5; rects.push([s.x + s.w * f0 - pad, s.y - s.h * 0.3, s.x + s.w * f1 + pad, s.y + s.h * 1.05]); }
          }
          if (!rects.length) { const [p] = await out.copyPages(src, [i - 1]); out.addPage(p); continue; }
          const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
          const ctx = c.getContext("2d")!; await page.render({ canvasContext: ctx, viewport: vp, canvas: c }).promise;
          ctx.fillStyle = "#000";
          for (const r of rects) { const [a, b, c2, d, e, f2] = vp.transform, tx = (x: number, y: number) => [a * x + c2 * y + e, b * x + d * y + f2], [x1, y1] = tx(r[0], r[1]), [x2, y2] = tx(r[2], r[3]); ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); }
          const jpg = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.9)), img = await out.embedJpg(await jpg.arrayBuffer()), p = out.addPage([vp1.width, vp1.height]);
          p.drawImage(img, { x: 0, y: 0, width: vp1.width, height: vp1.height });
        }
        if (!total) throw new Error("None of those words were found in the PDF");
        progress(`Redacted ${total} match${total === 1 ? "" : "es"}`);
        return { blob: pdfBlob(await out.save()), name: `${base(f)}-redacted.pdf` };
      }} />
  );
}

export const tools: Record<string, ComponentType> = {
  "pdf-to-text": PdfToText, "text-to-pdf": TextToPdf, "edit-pdf-metadata": Metadata, "crop-pdf": Crop, "flatten-pdf": Flatten, "sign-pdf": Sign, "compare-pdf": Compare, "redact-pdf": Redact,
};
