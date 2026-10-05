"use client";
import { useState, type ComponentType } from "react";
import { FileTool, Num, Select, Field, type Output } from "@/components/templates";

const base = (f: File) => f.name.replace(/\.[^.]+$/, "");
const pdfBlob = (b: Uint8Array) => new Blob([b as BlobPart], { type: "application/pdf" });

/** "1-3, 5, 8-" → zero-based page indices */
export function parseRanges(spec: string, total: number): number[] {
  const out: number[] = [];
  for (const part of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d*)\s*-\s*(\d*)$/);
    if (m) { const a = m[1] ? +m[1] : 1, b = m[2] ? +m[2] : total; for (let i = a; i <= b; i++) if (i >= 1 && i <= total) out.push(i - 1); }
    else if (/^\d+$/.test(part)) { const n = +part; if (n >= 1 && n <= total) out.push(n - 1); }
    else throw new Error(`Invalid page range: "${part}"`);
  }
  if (!out.length) throw new Error("No valid pages selected");
  return out;
}
async function load(f: File) { const { PDFDocument } = await import("pdf-lib"); return { PDFDocument, src: await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: false }) }; }
async function pick(f: File, idx: number[]) { const { PDFDocument, src } = await load(f); const out = await PDFDocument.create(); (await out.copyPages(src, idx)).forEach((p) => out.addPage(p)); return pdfBlob(await out.save()); }

function Merge() {
  return <FileTool accept=".pdf,application/pdf" multiple minFiles={2} actionLabel="Merge PDFs" run={async (files) => {
    const { PDFDocument } = await import("pdf-lib"); const out = await PDFDocument.create();
    for (const f of files) { const s = await PDFDocument.load(await f.arrayBuffer()); (await out.copyPages(s, s.getPageIndices())).forEach((p) => out.addPage(p)); }
    return { blob: pdfBlob(await out.save()), name: "merged.pdf" };
  }} />;
}

function Split() {
  const [mode, setMode] = useState("each"), [spec, setSpec] = useState("1-3, 5");
  return <FileTool accept=".pdf" actionLabel="Split PDF"
    extra={<div className="grid gap-3 sm:grid-cols-2"><Select label="Mode" value={mode} onChange={setMode} options={[{ value: "each", label: "Every page as separate PDF" }, { value: "range", label: "Custom ranges (one PDF each)" }]} />{mode === "range" && <Field label="Ranges, e.g. 1-3, 5, 7-"><input className="input" value={spec} onChange={(e) => setSpec(e.target.value)} /></Field>}</div>}
    run={async ([f]) => {
      const { src } = await load(f), n = src.getPageCount(), outs: Output[] = [];
      if (mode === "each") for (let i = 0; i < n; i++) outs.push({ blob: await pick(f, [i]), name: `${base(f)}-page-${i + 1}.pdf` });
      else for (const part of spec.split(",").map((s) => s.trim()).filter(Boolean)) outs.push({ blob: await pick(f, parseRanges(part, n)), name: `${base(f)}-${part.replace(/\s/g, "")}.pdf` });
      return outs;
    }} />;
}

function Rotate() {
  const [deg, setDeg] = useState("90"), [spec, setSpec] = useState("");
  return <FileTool accept=".pdf" actionLabel="Rotate PDF"
    extra={<div className="grid gap-3 sm:grid-cols-2"><Select label="Rotate clockwise" value={deg} onChange={setDeg} options={[{ value: "90", label: "90°" }, { value: "180", label: "180°" }, { value: "270", label: "270°" }]} /><Field label="Pages (blank = all)"><input className="input" placeholder="e.g. 1-3, 5" value={spec} onChange={(e) => setSpec(e.target.value)} /></Field></div>}
    run={async ([f]) => {
      const { PDFDocument, src } = await load(f), { degrees } = await import("pdf-lib"); void PDFDocument;
      const idx = spec.trim() ? parseRanges(spec, src.getPageCount()) : src.getPageIndices();
      idx.forEach((i) => { const p = src.getPage(i); p.setRotation(degrees((p.getRotation().angle + +deg) % 360)); });
      return { blob: pdfBlob(await src.save()), name: `${base(f)}-rotated.pdf` };
    }} />;
}

const PagesTool = ({ mode }: { mode: "delete" | "extract" }) => {
  const [spec, setSpec] = useState("1");
  return <FileTool accept=".pdf" actionLabel={mode === "delete" ? "Delete pages" : "Extract pages"}
    extra={<Field label={mode === "delete" ? "Pages to delete, e.g. 2, 4-6" : "Pages to keep, e.g. 1-3, 7"}><input className="input" value={spec} onChange={(e) => setSpec(e.target.value)} /></Field>}
    run={async ([f]) => {
      const { src } = await load(f), n = src.getPageCount(), sel = new Set(parseRanges(spec, n));
      const idx = mode === "extract" ? parseRanges(spec, n) : src.getPageIndices().filter((i) => !sel.has(i));
      if (!idx.length) throw new Error("That would remove every page");
      return { blob: await pick(f, idx), name: `${base(f)}-${mode === "delete" ? "trimmed" : "extract"}.pdf` };
    }} />;
};

function Organize() {
  const [order, setOrder] = useState("");
  return <FileTool accept=".pdf" actionLabel="Reorder pages"
    extra={<Field label="New page order, e.g. 3, 1, 2, 4-6 (pages you omit are dropped; repeats allowed)"><input className="input" value={order} onChange={(e) => setOrder(e.target.value)} /></Field>}
    run={async ([f]) => { const { src } = await load(f); return { blob: await pick(f, parseRanges(order || `1-${src.getPageCount()}`, src.getPageCount())), name: `${base(f)}-organized.pdf` }; }} />;
}

function Watermark() {
  const [text, setText] = useState("CONFIDENTIAL"), [size, setSize] = useState("60"), [opacity, setOpacity] = useState("0.25");
  return <FileTool accept=".pdf" actionLabel="Add watermark"
    extra={<div className="grid gap-3 sm:grid-cols-3"><Field label="Text"><input className="input" value={text} onChange={(e) => setText(e.target.value)} /></Field><Num label="Font size" value={size} onChange={setSize} /><Num label="Opacity (0–1)" value={opacity} onChange={setOpacity} /></div>}
    run={async ([f]) => {
      const { src } = await load(f), { StandardFonts, rgb, degrees } = await import("pdf-lib"), font = await src.embedFont(StandardFonts.HelveticaBold), fs = +size || 60;
      for (const p of src.getPages()) {
        const { width, height } = p.getSize(), w = font.widthOfTextAtSize(text, fs), a = Math.PI / 4;
        p.drawText(text, { x: width / 2 - (w / 2) * Math.cos(a) + (fs / 3) * Math.sin(a), y: height / 2 - (w / 2) * Math.sin(a) - (fs / 3) * Math.cos(a), size: fs, font, color: rgb(0.5, 0.5, 0.5), opacity: Math.min(1, Math.max(0, +opacity)), rotate: degrees(45) });
      }
      return { blob: pdfBlob(await src.save()), name: `${base(f)}-watermarked.pdf` };
    }} />;
}

function PageNumbers() {
  const [pos, setPos] = useState("bottom-center"), [start, setStart] = useState("1"), [fmt, setFmt] = useState("{n} / {total}");
  return <FileTool accept=".pdf" actionLabel="Add page numbers"
    extra={<div className="grid gap-3 sm:grid-cols-3"><Select label="Position" value={pos} onChange={setPos} options={["bottom-center", "bottom-right", "bottom-left", "top-center", "top-right", "top-left"]} /><Num label="Start at" value={start} onChange={setStart} /><Field label="Format"><input className="input" value={fmt} onChange={(e) => setFmt(e.target.value)} /></Field></div>}
    run={async ([f]) => {
      const { src } = await load(f), { StandardFonts, rgb } = await import("pdf-lib"), font = await src.embedFont(StandardFonts.Helvetica), pages = src.getPages();
      pages.forEach((p, i) => {
        const label = fmt.replace("{n}", String((+start || 1) + i)).replace("{total}", String(pages.length)), { width, height } = p.getSize(), w = font.widthOfTextAtSize(label, 10);
        const x = pos.endsWith("left") ? 36 : pos.endsWith("right") ? width - 36 - w : (width - w) / 2, y = pos.startsWith("top") ? height - 28 : 24;
        p.drawText(label, { x, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
      });
      return { blob: pdfBlob(await src.save()), name: `${base(f)}-numbered.pdf` };
    }} />;
}

function PdfToJpg() {
  const [scale, setScale] = useState("2"), [fmt, setFmt] = useState("jpeg");
  return <FileTool accept=".pdf" actionLabel="Convert to images"
    extra={<div className="grid gap-3 sm:grid-cols-2"><Select label="Format" value={fmt} onChange={setFmt} options={[{ value: "jpeg", label: "JPG" }, { value: "png", label: "PNG" }]} /><Select label="Quality" value={scale} onChange={setScale} options={[{ value: "1", label: "Standard (72 dpi)" }, { value: "2", label: "High (144 dpi)" }, { value: "3", label: "Very high (216 dpi)" }]} /></div>}
    run={async ([f], progress) => {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
      const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise, outs: Output[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        progress(`Page ${i} of ${doc.numPages}`);
        const page = await doc.getPage(i), vp = page.getViewport({ scale: +scale }), c = document.createElement("canvas");
        c.width = vp.width; c.height = vp.height;
        await page.render({ canvasContext: c.getContext("2d")!, viewport: vp, canvas: c }).promise;
        const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), `image/${fmt}`, 0.92));
        outs.push({ blob, name: `${base(f)}-${i}.${fmt === "jpeg" ? "jpg" : "png"}` });
      }
      return outs;
    }} />;
}

function JpgToPdf() {
  const [fit, setFit] = useState("a4");
  return <FileTool accept=".jpg,.jpeg,.png,.webp,image/*" multiple actionLabel="Create PDF"
    extra={<Select label="Page size" value={fit} onChange={setFit} options={[{ value: "a4", label: "A4 (fit image)" }, { value: "image", label: "Same as image" }]} />}
    run={async (files) => {
      const { PDFDocument } = await import("pdf-lib"), out = await PDFDocument.create();
      for (const f of files) {
        // Re-encode via canvas so WEBP and odd JPEGs embed reliably as PNG/JPEG.
        const bmp = await createImageBitmap(f), c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
        const ctx = c.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0);
        const jpg = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.92)), img = await out.embedJpg(await jpg.arrayBuffer());
        const [pw, ph] = fit === "a4" ? [595.28, 841.89] : [img.width, img.height], page = out.addPage([pw, ph]), s = fit === "a4" ? Math.min((pw - 40) / img.width, (ph - 40) / img.height) : 1;
        page.drawImage(img, { x: (pw - img.width * s) / 2, y: (ph - img.height * s) / 2, width: img.width * s, height: img.height * s });
      }
      return { blob: pdfBlob(await out.save()), name: "images.pdf" };
    }} />;
}

export const tools: Record<string, ComponentType> = {
  "merge-pdf": Merge, "split-pdf": Split, "rotate-pdf": Rotate, "delete-pdf-pages": () => <PagesTool mode="delete" />, "extract-pdf-pages": () => <PagesTool mode="extract" />,
  "organize-pdf": Organize, "pdf-watermark": Watermark, "pdf-page-numbers": PageNumbers, "pdf-to-jpg": PdfToJpg, "jpg-to-pdf": JpgToPdf,
};
