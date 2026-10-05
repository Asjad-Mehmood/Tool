import { PDFDocument, PDFCheckBox, PDFDropdown, PDFOptionList, PDFRadioGroup, PDFTextField, PDFButton } from "pdf-lib";
import { getPdfjs } from "@/lib/pdfjs";
import { FontBook } from "./fonts";
import { pageRot, uid, type FontKey, type FormFieldInfo, type Meta, type PageState, type Rect } from "./types";

type Pdfjs = Awaited<ReturnType<typeof getPdfjs>>;
export type DocProxy = Awaited<ReturnType<Pdfjs["getDocument"]>["promise"]>;
export type PageProxy = Awaited<ReturnType<DocProxy["getPage"]>>;

export interface TextLine {
  text: string; x: number; y: number; w: number; h: number; baseline: number; size: number;
  font: FontKey; bold: boolean; italic: boolean; items: { str: string; x: number; w: number }[];
}

export function guessFont(name: string, family: string, flags: { bold?: boolean; italic?: boolean } = {}): { font: FontKey; bold: boolean; italic: boolean } {
  const n = `${name} ${family}`.toLowerCase();
  const bold = Boolean(flags.bold) || /bold|black|heavy|semibold|demi/.test(n), italic = Boolean(flags.italic) || /italic|oblique|slanted/.test(n);
  const font: FontKey = /mono|courier|consol|typewriter|code/.test(n) ? "courier" : /times|serif(?!.*sans)|georgia|garamond|minion|cambria|palatino|bookman|century|roman|book antiqua/.test(n) && !/sans/.test(n) ? "times" : "helvetica";
  return { font, bold, italic };
}

/** Owns the pdf.js documents for every source PDF and caches page proxies and extracted text lines. */
export class Sources {
  list: { name: string; bytes: Uint8Array; proxy: DocProxy; pages: Map<number, Promise<PageProxy>> }[] = [];
  private lineCache = new Map<string, Promise<TextLine[]>>();

  async add(name: string, bytes: Uint8Array): Promise<{ doc: number; numPages: number }> {
    const pdfjs = await getPdfjs();
    const proxy = await pdfjs.getDocument({ data: bytes.slice() }).promise;
    this.list.push({ name, bytes, proxy, pages: new Map() });
    return { doc: this.list.length - 1, numPages: proxy.numPages };
  }
  page(doc: number, index: number): Promise<PageProxy> {
    const s = this.list[doc];
    let p = s.pages.get(index);
    if (!p) { p = s.proxy.getPage(index + 1); s.pages.set(index, p); }
    return p;
  }
  /** Horizontal text lines of a page as they appear visually (after rotation), in points. */
  lines(ps: PageState): Promise<TextLine[]> {
    if (!ps.src) return Promise.resolve([]);
    const key = `${ps.src.doc}:${ps.src.index}:${pageRot(ps)}`;
    let p = this.lineCache.get(key);
    if (!p) { p = this.computeLines(ps); this.lineCache.set(key, p); }
    return p;
  }
  private async computeLines(ps: PageState): Promise<TextLine[]> {
    const page = await this.page(ps.src!.doc, ps.src!.index), vp = page.getViewport({ scale: 1, rotation: pageRot(ps) }), tc = await page.getTextContent();
    try { await page.getOperatorList(); } catch { /* fonts stay unresolved; the guess falls back to family names */ } // loads the real font objects so bold/italic/serif can be detected
    const [a, b, c, d, e, f] = vp.transform;
    type It = { str: string; x: number; base: number; w: number; size: number; font: FontKey; bold: boolean; italic: boolean };
    const items: It[] = [];
    for (const it of tc.items) {
      if (!("str" in it) || !it.str) continue;
      const t = it.transform, dx = a * t[0] + c * t[1], dy = b * t[0] + d * t[1];
      if (Math.abs(Math.atan2(dy, dx)) > 0.03) continue; // only horizontal text is editable
      const style = (tc.styles as Record<string, { fontFamily?: string }>)[it.fontName];
      let fo: { name?: string; loadedName?: string; fallbackName?: string; bold?: boolean; black?: boolean; italic?: boolean } = {};
      try { fo = (page.commonObjs.get(it.fontName) as typeof fo | undefined) ?? {}; } catch { /* font object not resolved yet */ }
      const g = guessFont(`${fo.name ?? ""} ${fo.loadedName ?? ""}`, `${style?.fontFamily ?? ""} ${fo.fallbackName ?? ""}`, { bold: fo.bold || fo.black, italic: fo.italic });
      items.push({ str: it.str, x: a * t[4] + c * t[5] + e, base: b * t[4] + d * t[5] + f, w: it.width, size: Math.hypot(t[2], t[3]) || it.height, ...g });
    }
    items.sort((p, q) => (Math.abs(p.base - q.base) < Math.min(p.size, q.size) * 0.35 ? p.x - q.x : p.base - q.base));
    const lines: TextLine[] = [];
    for (const it of items) {
      const cur = lines[lines.length - 1];
      if (cur && Math.abs(cur.baseline - it.base) < it.size * 0.35 && it.x - (cur.x + cur.w) < it.size * 1.4 && it.x >= cur.x - it.size) {
        const gap = it.x - (cur.x + cur.w), join = gap > it.size * 0.18 && !cur.text.endsWith(" ") && !it.str.startsWith(" ") ? " " : "";
        cur.text += join + it.str; cur.items.push({ str: it.str, x: it.x, w: it.w }); cur.w = Math.max(cur.w, it.x + it.w - cur.x);
        if (it.str.trim()) { cur.size = Math.max(cur.size, it.size); }
      } else if (it.str.trim()) {
        lines.push({ text: it.str, x: it.x, w: it.w, baseline: it.base, size: it.size, h: it.size * 1.15, y: it.base - it.size * 0.9, font: it.font, bold: it.bold, italic: it.italic, items: [{ str: it.str, x: it.x, w: it.w }] });
      }
    }
    for (const l of lines) { l.h = l.size * 1.15; l.y = l.baseline - l.size * 0.9; l.text = l.text.replace(/\s+$/, ""); }
    return lines;
  }
  destroy() { for (const s of this.list) (s.proxy as unknown as { destroy?: () => Promise<void> }).destroy?.().catch(() => {}); this.list = []; this.lineCache.clear(); }
}

/** Where `needle` occurs inside a line, as rects (sub-ranges of the item boxes, measured with real font metrics). */
export function matchRects(line: TextLine, needle: string, caseSensitive: boolean, wholeWord: boolean, fb: FontBook): { rect: Rect; start: number; end: number }[] {
  const hay = caseSensitive ? line.text : line.text.toLowerCase(), n = caseSensitive ? needle : needle.toLowerCase(), out: { rect: Rect; start: number; end: number }[] = [];
  if (!n) return out;
  for (let at = hay.indexOf(n); at !== -1; at = hay.indexOf(n, at + Math.max(1, n.length))) {
    const end = at + n.length;
    if (wholeWord && (/\w/.test(hay[at - 1] ?? " ") || /\w/.test(hay[end] ?? " "))) continue;
    // map [at,end) onto the line's items; the joined text may contain synthetic spaces between items
    let pos = 0, x0 = Infinity, x1 = -Infinity;
    for (const it of line.items) {
      const rest = line.text.indexOf(it.str, pos); const s = rest === -1 ? pos : rest, e = s + it.str.length; pos = e;
      const a = Math.max(at, s), b = Math.min(end, e);
      if (b <= a) continue;
      const frac = (txt: string) => { const full = fb.width(line.font, line.bold, line.italic, it.str, line.size) || 1; return fb.width(line.font, line.bold, line.italic, txt, line.size) / full; };
      const sx = it.x + it.w * frac(it.str.slice(0, a - s)), ex = it.x + it.w * frac(it.str.slice(0, b - s));
      x0 = Math.min(x0, sx); x1 = Math.max(x1, ex);
    }
    if (x0 < x1) out.push({ rect: { x: x0, y: line.y, w: x1 - x0, h: line.h }, start: at, end });
  }
  return out;
}

/** Estimate background and text colours inside a rect of a rendered page canvas. */
export function sampleColors(canvas: HTMLCanvasElement | undefined, pxPerPt: number, r: Rect): { bg: string; fg: string } {
  const fallback = { bg: "#ffffff", fg: "#000000" };
  if (!canvas) return fallback;
  try {
    const x = Math.max(0, Math.floor(r.x * pxPerPt)), y = Math.max(0, Math.floor(r.y * pxPerPt));
    const w = Math.min(canvas.width - x, Math.ceil(r.w * pxPerPt)), h = Math.min(canvas.height - y, Math.ceil(r.h * pxPerPt));
    if (w < 2 || h < 2) return fallback;
    const data = canvas.getContext("2d")!.getImageData(x, y, w, h).data, hist = new Map<number, number>();
    for (let i = 0; i < data.length; i += 4) { const k = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4); hist.set(k, (hist.get(k) ?? 0) + 1); }
    let bestK = 0, bestN = -1; for (const [k, n] of hist) if (n > bestN) { bestK = k; bestN = n; }
    // average the true pixels of the dominant bucket for an accurate background
    let br = 0, bg = 0, bb = 0, bn = 0;
    for (let i = 0; i < data.length; i += 4) { const k = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4); if (k === bestK) { br += data[i]; bg += data[i + 1]; bb += data[i + 2]; bn++; } }
    br /= bn; bg /= bn; bb /= bn;
    const dist = (i: number) => Math.abs(data[i] - br) + Math.abs(data[i + 1] - bg) + Math.abs(data[i + 2] - bb);
    const far: { d: number; i: number }[] = [];
    for (let i = 0; i < data.length; i += 4) { const d = dist(i); if (d > 90) far.push({ d, i }); }
    const hex = (r2: number, g: number, b2: number) => "#" + [r2, g, b2].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
    let fg = "#000000";
    if (far.length) { far.sort((p, q) => q.d - p.d); const top = far.slice(0, Math.max(1, Math.floor(far.length * 0.25))); let r3 = 0, g3 = 0, b3 = 0; for (const t of top) { r3 += data[t.i]; g3 += data[t.i + 1]; b3 += data[t.i + 2]; } fg = hex(r3 / top.length, g3 / top.length, b3 / top.length); }
    return { bg: hex(br, bg, bb), fg };
  } catch { return fallback; }
}

export async function loadFormFields(bytes: Uint8Array): Promise<FormFieldInfo[]> {
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false }), out: FormFieldInfo[] = [];
    for (const f of doc.getForm().getFields()) {
      const name = f.getName(), readOnly = f.isReadOnly();
      if (f instanceof PDFTextField) out.push({ name, kind: "text", value: f.getText() ?? "", readOnly });
      else if (f instanceof PDFCheckBox) out.push({ name, kind: "checkbox", value: f.isChecked(), readOnly });
      else if (f instanceof PDFRadioGroup) out.push({ name, kind: "radio", value: f.getSelected() ?? "", options: f.getOptions(), readOnly });
      else if (f instanceof PDFDropdown) out.push({ name, kind: "dropdown", value: f.getSelected()[0] ?? "", options: f.getOptions(), readOnly });
      else if (f instanceof PDFOptionList) out.push({ name, kind: "list", value: f.getSelected()[0] ?? "", options: f.getOptions(), readOnly });
      else if (f instanceof PDFButton) out.push({ name, kind: "button", value: "", readOnly });
      else out.push({ name, kind: "other", value: "", readOnly });
    }
    return out;
  } catch { return []; }
}

export async function loadMeta(bytes: Uint8Array): Promise<Meta> {
  const d = await PDFDocument.load(bytes, { updateMetadata: false });
  return { title: d.getTitle() ?? "", author: d.getAuthor() ?? "", subject: d.getSubject() ?? "", keywords: d.getKeywords() ?? "", creator: d.getCreator() ?? "" };
}

/** Build page states for every page of a freshly added source. */
export async function pagesForSource(src: Sources, doc: number, numPages: number): Promise<PageState[]> {
  const out: PageState[] = [];
  for (let i = 0; i < numPages; i++) {
    const p = await src.page(doc, i);
    out.push({ id: uid(), src: { doc, index: i }, view: p.view as [number, number, number, number], nativeRot: ((p.rotate % 360) + 360) % 360, extra: 0, crop: null, objects: [] });
  }
  return out;
}

export async function blankPdf(w = 595.28, h = 841.89): Promise<Uint8Array> {
  const d = await PDFDocument.create(); d.addPage([w, h]); return d.save();
}
