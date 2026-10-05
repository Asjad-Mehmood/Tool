import { BlendMode, LineCapStyle, PDFCheckBox, PDFDocument, PDFDropdown, PDFHexString, PDFName, PDFOptionList, PDFPage, PDFRadioGroup, PDFString, PDFTextField, degrees, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { center, hexToRgb01, parseRange, rotateAround } from "./geometry";
import { FontBook, layoutText } from "./fonts";
import { pageRot, pageSize, type Dash, type EditorDoc, type FormValues, type ImageAsset, type Obj, type PageState, type Pt, type SourceDoc, type TextObj } from "./types";

export interface ExportOptions {
  flattenForms: boolean;
  /** Re-render pages that contain redaction boxes as images so the covered content is really gone. */
  permanentRedaction: boolean;
  useObjectStreams: boolean;
  /** Export only these page ids (in document order). */
  onlyPages?: string[];
}
export interface ExportInput {
  doc: EditorDoc; sources: SourceDoc[]; assets: Map<string, ImageAsset>; fonts: FontBook; options: ExportOptions; formValues: FormValues;
  progress?: (msg: string) => void;
}
export interface ExportResult { bytes: Uint8Array; warnings: string[] }

const col = (hex: string) => { const [r, g, b] = hexToRgb01(hex); return rgb(r, g, b); };
const dashes = (d: Dash, w: number) => (d === "dashed" ? [w * 4, w * 2.5] : d === "dotted" ? [w * 0.1, w * 2.2] : undefined);
const K = 0.5522847498;

type Seg = { c: "M" | "L" | "C" | "Z"; p: Pt[] };

/** Everything needed to turn visual-frame geometry into PDF user space for one page. */
function pageMapper(ps: PageState) {
  const R = pageRot(ps), W = ps.view[2] - ps.view[0], H = ps.view[3] - ps.view[1];
  const toUser = (v: Pt): Pt => {
    let ux: number, uy: number;
    if (R === 0) { ux = v.x; uy = H - v.y; } else if (R === 90) { ux = v.y; uy = v.x; } else if (R === 180) { ux = W - v.x; uy = v.y; } else { ux = W - v.y; uy = H - v.x; }
    return { x: ux + ps.view[0], y: uy + ps.view[1] };
  };
  return { R, toUser, angle: (theta: number) => R - theta };
}
type Mapper = ReturnType<typeof pageMapper>;

/** Local box coordinates (origin = box top-left, unrotated) → visual page coordinates. */
const localToVisual = (o: { x: number; y: number; w: number; h: number; rot: number }, lx: number, ly: number): Pt => rotateAround({ x: o.x + lx, y: o.y + ly }, center(o), o.rot);

function svgPath(segs: Seg[], map: (p: Pt) => Pt): string {
  const f = (p: Pt) => { const u = map(p); return `${u.x.toFixed(3)} ${(-u.y).toFixed(3)}`; }; // pdf-lib flips y for SVG paths
  return segs.map((s) => (s.c === "Z" ? "Z" : `${s.c} ${s.p.map(f).join(" ")}`)).join(" ");
}

function boxSegs(o: { w: number; h: number }, radius: number, ellipse: boolean): Seg[] {
  const { w, h } = o;
  if (ellipse) {
    const cx = w / 2, cy = h / 2, rx = w / 2, ry = h / 2;
    return [{ c: "M", p: [{ x: cx + rx, y: cy }] }, { c: "C", p: [{ x: cx + rx, y: cy + K * ry }, { x: cx + K * rx, y: cy + ry }, { x: cx, y: cy + ry }] }, { c: "C", p: [{ x: cx - K * rx, y: cy + ry }, { x: cx - rx, y: cy + K * ry }, { x: cx - rx, y: cy }] }, { c: "C", p: [{ x: cx - rx, y: cy - K * ry }, { x: cx - K * rx, y: cy - ry }, { x: cx, y: cy - ry }] }, { c: "C", p: [{ x: cx + K * rx, y: cy - ry }, { x: cx + rx, y: cy - K * ry }, { x: cx + rx, y: cy }] }, { c: "Z", p: [] }];
  }
  const r = Math.min(radius, w / 2, h / 2);
  if (r <= 0.01) return [{ c: "M", p: [{ x: 0, y: 0 }] }, { c: "L", p: [{ x: w, y: 0 }] }, { c: "L", p: [{ x: w, y: h }] }, { c: "L", p: [{ x: 0, y: h }] }, { c: "Z", p: [] }];
  const k = r * (1 - K);
  return [
    { c: "M", p: [{ x: r, y: 0 }] }, { c: "L", p: [{ x: w - r, y: 0 }] }, { c: "C", p: [{ x: w - k, y: 0 }, { x: w, y: k }, { x: w, y: r }] },
    { c: "L", p: [{ x: w, y: h - r }] }, { c: "C", p: [{ x: w, y: h - k }, { x: w - k, y: h }, { x: w - r, y: h }] },
    { c: "L", p: [{ x: r, y: h }] }, { c: "C", p: [{ x: k, y: h }, { x: 0, y: h - k }, { x: 0, y: h - r }] },
    { c: "L", p: [{ x: 0, y: r }] }, { c: "C", p: [{ x: 0, y: k }, { x: k, y: 0 }, { x: r, y: 0 }] }, { c: "Z", p: [] },
  ];
}

/** Smooth freehand points with quadratic curves through midpoints. */
function smoothSegs(pts: Pt[]): Seg[] {
  if (pts.length === 1) { const p = pts[0]; return [{ c: "M", p: [p] }, { c: "L", p: [{ x: p.x + 0.01, y: p.y }] }]; }
  const segs: Seg[] = [{ c: "M", p: [pts[0]] }];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, p0 = segs[segs.length - 1].p.slice(-1)[0];
    // elevate the quadratic (a → m) to a cubic so every command uses the same form
    segs.push({ c: "C", p: [{ x: p0.x + (2 / 3) * (a.x - p0.x), y: p0.y + (2 / 3) * (a.y - p0.y) }, { x: m.x + (2 / 3) * (a.x - m.x), y: m.y + (2 / 3) * (a.y - m.y) }, m] });
  }
  segs.push({ c: "L", p: [pts[pts.length - 1]] });
  return segs;
}
export const inkPathD = (pts: Pt[]) => smoothSegs(pts).map((s) => (s.c === "Z" ? "Z" : `${s.c} ${s.p.map((p) => `${p.x} ${p.y}`).join(" ")}`)).join(" ");

/** Render text objects that standard fonts can't encode (Arabic, CJK, symbols…) to a PNG. Browser only. */
async function rasterizeText(o: TextObj, fb: FontBook): Promise<{ png: Uint8Array; w: number; h: number }> {
  const l = layoutText(o, fb), S = 4, pad = 2, font = `${o.italic ? "italic " : ""}${o.bold ? "bold " : ""}${o.size}px ${fb.css(o.font)}`;
  const probe = document.createElement("canvas").getContext("2d")!; probe.font = font;
  const textW = Math.max(l.w, ...l.lines.map((ln) => probe.measureText(ln.text).width)), w = textW + pad * 2, h = l.h + pad * 2;
  const c = document.createElement("canvas"); c.width = Math.ceil(w * S); c.height = Math.ceil(h * S);
  const g = c.getContext("2d")!; g.scale(S, S); g.fillStyle = o.color; g.font = font; g.textBaseline = "alphabetic"; g.textAlign = "left";
  for (const ln of l.lines) {
    const mw = g.measureText(ln.text).width, x = o.align === "center" ? (textW - mw) / 2 : o.align === "right" ? textW - mw : 0;
    g.direction = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff]/.test(ln.text) ? "rtl" : "ltr";
    g.fillText(ln.text, pad + x, pad + ln.baseline);
    if (o.underline) g.fillRect(pad + x, pad + ln.baseline + o.size * 0.12, mw, Math.max(0.6, o.size * 0.06));
    if (o.strike) g.fillRect(pad + x, pad + ln.baseline - o.size * 0.28, mw, Math.max(0.6, o.size * 0.06));
  }
  const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/png"));
  return { png: new Uint8Array(await blob.arrayBuffer()), w, h };
}

interface Ctx {
  out: PDFDocument; fonts: FontBook; assets: Map<string, ImageAsset>; warnings: string[];
  embedded: Map<string, PDFFont>; images: Map<string, PDFImage>;
  pageLinks: { page: PDFPage; rect: number[]; target: number }[];
}
async function outFont(cx: Ctx, key: string, bold: boolean, italic: boolean): Promise<PDFFont> {
  const id = key.startsWith("custom:") ? key : `${key}:${bold}:${italic}`;
  let f = cx.embedded.get(id);
  if (!f) {
    const cf = cx.fonts.customs.get(key);
    f = cf ? await cx.out.embedFont(cf.bytes, { subset: true }) : await cx.out.embedFont(FontBook.standardName(key, bold, italic));
    cx.embedded.set(id, f);
  }
  return f;
}
async function outImage(cx: Ctx, imgId: string): Promise<PDFImage | null> {
  let im = cx.images.get(imgId);
  if (!im) {
    const a = cx.assets.get(imgId);
    if (!a) return null;
    im = a.mime === "image/png" ? await cx.out.embedPng(a.bytes) : await cx.out.embedJpg(a.bytes);
    cx.images.set(imgId, im);
  }
  return im;
}

async function drawText(cx: Ctx, page: PDFPage, m: Mapper, o: TextObj) {
  if (!o.text.trim() && !o.bg) return;
  const op = o.opacity;
  if (o.bg) {
    const segs = boxSegs(o, 0, false);
    page.drawSvgPath(svgPath(segs, (p) => m.toUser(localToVisual(o, p.x, p.y))), { x: 0, y: 0, color: col(o.bg), opacity: op });
  }
  if (!o.text.trim()) return;
  const layout = layoutText(o, cx.fonts);
  if (!cx.fonts.canEncode(o.font, o.bold, o.italic, o.text.replace(/[\n\t]/g, " "))) {
    if (typeof document === "undefined") { cx.warnings.push("Text with unsupported characters was skipped."); return; }
    const r = await rasterizeText(o, cx.fonts), png = await cx.out.embedPng(r.png), u = m.toUser(localToVisual(o, -2, r.h - 2));
    page.drawImage(png, { x: u.x, y: u.y, width: r.w, height: r.h, rotate: degrees(m.angle(o.rot)), opacity: op });
    cx.warnings.push("Some text uses characters the standard fonts lack, so it was saved as an image. Load a font that covers them to keep it selectable.");
    return;
  }
  const font = await outFont(cx, o.font, o.bold, o.italic), color = col(o.color), rot = degrees(m.angle(o.rot));
  for (const ln of layout.lines) {
    if (!ln.text) continue;
    const u = m.toUser(localToVisual(o, ln.x, ln.baseline));
    page.drawText(ln.text, { x: u.x, y: u.y, size: o.size, font, color, opacity: op, rotate: rot });
    const thick = Math.max(0.5, o.size * 0.055);
    if (o.underline) { const a = m.toUser(localToVisual(o, ln.x, ln.baseline + o.size * 0.12)), b = m.toUser(localToVisual(o, ln.x + ln.w, ln.baseline + o.size * 0.12)); page.drawLine({ start: { x: a.x, y: a.y }, end: { x: b.x, y: b.y }, thickness: thick, color, opacity: op }); }
    if (o.strike) { const a = m.toUser(localToVisual(o, ln.x, ln.baseline - o.size * 0.27)), b = m.toUser(localToVisual(o, ln.x + ln.w, ln.baseline - o.size * 0.27)); page.drawLine({ start: { x: a.x, y: a.y }, end: { x: b.x, y: b.y }, thickness: thick, color, opacity: op }); }
  }
}

function arrowHead(tip: Pt, from: Pt, size: number): Seg[] {
  const a = Math.atan2(tip.y - from.y, tip.x - from.x), s = Math.PI / 7;
  const p1 = { x: tip.x - size * Math.cos(a - s), y: tip.y - size * Math.sin(a - s) }, p2 = { x: tip.x - size * Math.cos(a + s), y: tip.y - size * Math.sin(a + s) };
  return [{ c: "M", p: [tip] }, { c: "L", p: [p1] }, { c: "L", p: [p2] }, { c: "Z", p: [] }];
}
export const arrowHeadSize = (w: number) => Math.max(6, w * 4.5);

/** Real PDF annotations (comments and links) for the object, without drawing anything. */
function annotRect(m: Mapper, o: { x: number; y: number; w: number; h: number }): number[] {
  const a = m.toUser({ x: o.x, y: o.y }), b = m.toUser({ x: o.x + o.w, y: o.y + o.h });
  return [Math.min(a.x, b.x), Math.min(a.y, b.y), Math.max(a.x, b.x), Math.max(a.y, b.y)];
}
function addAnnotation(doc: PDFDocument, page: PDFPage, m: Mapper, o: Obj, pageLinks: Ctx["pageLinks"]) {
  const c = doc.context;
  if (o.type === "note") {
    const [r, g, bl] = hexToRgb01(o.color);
    page.node.addAnnot(c.register(c.obj({ Type: "Annot", Subtype: "Text", Rect: annotRect(m, o), Contents: PDFHexString.fromText(o.text), Name: "Comment", C: [r, g, bl], F: 4, T: PDFHexString.fromText("ToolHub") })));
  } else if (o.type === "link") {
    if (o.kind === "url") page.node.addAnnot(c.register(c.obj({ Type: "Annot", Subtype: "Link", Rect: annotRect(m, o), Border: [0, 0, 0], F: 4, A: { Type: "Action", S: "URI", URI: PDFString.of(o.url) } })));
    else pageLinks.push({ page, rect: annotRect(m, o), target: o.page - 1 });
  }
}
function resolvePageLinks(doc: PDFDocument, list: PDFPage[], links: Ctx["pageLinks"]) {
  for (const l of links) {
    const target = list[Math.min(Math.max(l.target, 0), list.length - 1)], c = doc.context;
    l.page.node.addAnnot(c.register(c.obj({ Type: "Annot", Subtype: "Link", Rect: l.rect, Border: [0, 0, 0], F: 4, Dest: [target.ref, PDFName.of("Fit")] })));
  }
}

async function drawObject(cx: Ctx, page: PDFPage, ps: PageState, m: Mapper, o: Obj, pageIndex: number): Promise<void> {
  const ident = (p: Pt) => m.toUser(p);
  switch (o.type) {
    case "text": return drawText(cx, page, m, o);
    case "rect": case "ellipse": {
      const d = svgPath(boxSegs(o, o.radius, o.type === "ellipse"), (p) => m.toUser(localToVisual(o, p.x, p.y)));
      const opts: Parameters<PDFPage["drawSvgPath"]>[1] = { x: 0, y: 0, opacity: o.opacity, borderOpacity: o.opacity };
      if (o.fill) opts.color = col(o.fill);
      if (o.stroke && o.strokeW > 0) { opts.borderColor = col(o.stroke); opts.borderWidth = o.strokeW; const da = dashes(o.dash, o.strokeW); if (da) { opts.borderDashArray = da; opts.borderLineCap = LineCapStyle.Round; } }
      if (!opts.color && !opts.borderColor) return;
      page.drawSvgPath(d, opts); return;
    }
    case "line": case "arrow": {
      const [a, b] = o.pts, da = dashes(o.dash, o.strokeW), ua = ident(a), ub = ident(b), hs = arrowHeadSize(o.strokeW);
      const trim = (p: Pt, q: Pt, on: boolean): Pt => { if (!on || o.type !== "arrow") return p; const L = Math.hypot(q.x - p.x, q.y - p.y) || 1, t = Math.min(hs * 0.7, L / 2); return { x: p.x + ((q.x - p.x) / L) * t, y: p.y + ((q.y - p.y) / L) * t }; };
      const s0 = trim(a, b, o.head === "both"), s1 = trim(b, a, o.head !== "none"), us = ident(s0), ue = ident(s1);
      page.drawLine({ start: { x: us.x, y: us.y }, end: { x: ue.x, y: ue.y }, thickness: o.strokeW, color: col(o.stroke), opacity: o.opacity, dashArray: da, lineCap: LineCapStyle.Round });
      void ua; void ub;
      if (o.type === "arrow") {
        if (o.head !== "none") page.drawSvgPath(svgPath(arrowHead(b, a, hs), ident), { x: 0, y: 0, color: col(o.stroke), opacity: o.opacity });
        if (o.head === "both") page.drawSvgPath(svgPath(arrowHead(a, b, hs), ident), { x: 0, y: 0, color: col(o.stroke), opacity: o.opacity });
      }
      return;
    }
    case "ink": {
      for (const s of o.strokes) page.drawSvgPath(svgPath(smoothSegs(s), ident), { x: 0, y: 0, borderColor: col(o.color), borderWidth: o.strokeW, borderOpacity: o.opacity, borderLineCap: LineCapStyle.Round });
      return;
    }
    case "highlight": case "underline": case "strike": {
      for (const r of o.rects) {
        if (o.type === "highlight") {
          const segs = boxSegs({ w: r.w, h: r.h }, 0, false);
          page.drawSvgPath(svgPath(segs, (p) => ident({ x: r.x + p.x, y: r.y + p.y })), { x: 0, y: 0, color: col(o.color), opacity: o.opacity, blendMode: BlendMode.Multiply });
        } else {
          const y = o.type === "underline" ? r.y + r.h * 0.92 : r.y + r.h * 0.55, a = ident({ x: r.x, y }), b = ident({ x: r.x + r.w, y });
          page.drawLine({ start: { x: a.x, y: a.y }, end: { x: b.x, y: b.y }, thickness: Math.max(0.8, r.h * 0.07), color: col(o.color), opacity: o.opacity });
        }
      }
      return;
    }
    case "image": {
      const im = await outImage(cx, o.imgId);
      if (!im) return;
      const u = m.toUser(localToVisual(o, 0, o.h));
      page.drawImage(im, { x: u.x, y: u.y, width: o.w, height: o.h, rotate: degrees(m.angle(o.rot)), opacity: o.opacity });
      return;
    }
    case "cover": case "redact": {
      page.drawSvgPath(svgPath(boxSegs(o, 0, false), (p) => m.toUser(localToVisual(o, p.x, p.y))), { x: 0, y: 0, color: col(o.type === "redact" ? "#000000" : o.color), opacity: o.type === "redact" ? 1 : o.opacity });
      return;
    }
    case "stamp": {
      const font = await outFont(cx, "helvetica", true, false), tw = font.widthOfTextAtSize(o.label, o.size), color = col(o.color), pad = o.size * 0.35;
      const box = { x: o.x, y: o.y, w: tw + pad * 2, h: o.size * 1.25 + pad, rot: o.rot };
      page.drawSvgPath(svgPath(boxSegs(box, o.size * 0.15, false), (p) => m.toUser(localToVisual(box, p.x, p.y))), { x: 0, y: 0, borderColor: color, borderWidth: Math.max(1.5, o.size * 0.09), borderOpacity: o.opacity });
      const u = m.toUser(localToVisual(box, pad, box.h / 2 + o.size * 0.34));
      page.drawText(o.label, { x: u.x, y: u.y, size: o.size, font, color, opacity: o.opacity, rotate: degrees(m.angle(o.rot)) });
      return;
    }
    case "note": addAnnotation(cx.out, page, m, o, cx.pageLinks); return;
    case "link": {
      if (o.border) page.drawSvgPath(svgPath(boxSegs(o, 0, false), (p) => m.toUser(localToVisual(o, p.x, p.y))), { x: 0, y: 0, borderColor: rgb(0.1, 0.3, 0.9), borderWidth: 0.75, borderOpacity: 0.9 });
      addAnnotation(cx.out, page, m, o, cx.pageLinks); return;
    }
    case "field": {
      if (m.R !== 0) cx.warnings.push("Form fields on rotated pages may not line up.");
      const form = cx.out.getForm(), names = new Set(form.getFields().map((f) => f.getName()));
      let name = o.name.replace(/[^\w-]/g, "_") || "field", n = 1; while (names.has(name)) name = `${o.name.replace(/[^\w-]/g, "_")}_${++n}`;
      const a = ident({ x: o.x, y: o.y }), b = ident({ x: o.x + o.w, y: o.y + o.h }), box = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
      if (o.kind === "checkbox") { const cb = form.createCheckBox(name); cb.addToPage(page, { ...box, borderWidth: 1, borderColor: rgb(0.2, 0.2, 0.2) }); if (o.value === "true") cb.check(); }
      else { const tf = form.createTextField(name); if (o.multiline) tf.enableMultiline(); tf.addToPage(page, { ...box, borderWidth: 1, borderColor: rgb(0.2, 0.2, 0.2), backgroundColor: rgb(0.93, 0.95, 1) }); tf.setFontSize(o.fontSize); if (o.value) tf.setText(o.value); }
      return;
    }
  }
  void ps; void pageIndex;
}

const dateToken = () => new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
function textObj(p: Partial<TextObj> & { text: string; x: number; y: number }): TextObj {
  return { id: "x", type: "text", w: 0, h: 0, rot: 0, opacity: 1, font: "helvetica", size: 12, color: "#000000", bold: false, italic: false, underline: false, strike: false, align: "left", lineHeight: 1.2, wrap: false, bg: null, ...p };
}

export async function exportPdf(input: ExportInput): Promise<ExportResult> {
  const { doc, sources, assets, fonts, options, formValues } = input, say = input.progress ?? (() => {});
  const warnings: string[] = [];
  if (!sources.length) throw new Error("Open a PDF first");
  say("Preparing…");
  const out = await PDFDocument.load(sources[0].bytes, { updateMetadata: false, ignoreEncryption: false });
  out.registerFontkit(fontkit);
  const cx: Ctx = { out, fonts, assets, warnings, embedded: new Map(), images: new Map(), pageLinks: [] };

  const pages = options.onlyPages ? doc.pages.filter((p) => options.onlyPages!.includes(p.id)) : doc.pages;
  if (!pages.length) throw new Error("There are no pages to save");
  const originals = out.getPages(), others = new Map<number, PDFDocument>(), usedOriginal = new Set<number>();
  const list: PDFPage[] = [];
  for (const [i, ps] of pages.entries()) {
    say(`Assembling page ${i + 1} of ${pages.length}…`);
    let page: PDFPage;
    if (!ps.src) { page = PDFPage.create(out); page.setSize(ps.view[2] - ps.view[0], ps.view[3] - ps.view[1]); }
    else if (ps.src.doc === 0 && !usedOriginal.has(ps.src.index) && originals[ps.src.index]) { page = originals[ps.src.index]; usedOriginal.add(ps.src.index); }
    else {
      let from = ps.src.doc === 0 ? out : others.get(ps.src.doc);
      if (!from) { from = await PDFDocument.load(sources[ps.src.doc].bytes, { updateMetadata: false }); others.set(ps.src.doc, from); }
      [page] = await out.copyPages(from, [ps.src.index]);
    }
    list.push(page);
  }
  const deletedOriginal = originals.length - usedOriginal.size;
  for (let i = out.getPageCount() - 1; i >= 0; i--) out.removePage(i);
  for (const p of list) out.addPage(p);

  const total = pages.length, hf = doc.hf, wm = doc.watermark;
  const hfPages = parseRange(hf.range, total), wmPages = parseRange(wm.range, total);
  for (const [i, ps] of pages.entries()) {
    say(`Drawing page ${i + 1} of ${total}…`);
    const page = list[i], m = pageMapper(ps), size = pageSize(ps);
    page.setRotation(degrees(pageRot(ps)));
    for (const o of ps.objects) {
      try { await drawObject(cx, page, ps, m, o, i); } catch (e) { warnings.push(`A ${o.type} on page ${i + 1} could not be saved (${(e as Error).message}).`); }
    }
    if (hf.enabled && hfPages.has(i + 1)) {
      const sub = (s: string) => s.replace(/\{page\}/g, String(i + hf.startAt)).replace(/\{pages\}/g, String(total + hf.startAt - 1)).replace(/\{date\}/g, dateToken()).replace(/\{title\}/g, doc.meta.title);
      const slots: [string, "left" | "center" | "right", "top" | "bottom"][] = [[hf.tl, "left", "top"], [hf.tc, "center", "top"], [hf.tr, "right", "top"], [hf.bl, "left", "bottom"], [hf.bc, "center", "bottom"], [hf.br, "right", "bottom"]];
      for (const [raw, align, vert] of slots) {
        if (!raw.trim()) continue;
        const text = sub(raw), w = fonts.width(hf.font, false, false, text, hf.size), y = vert === "top" ? hf.margin : size.h - hf.margin - hf.size * 1.2;
        const x = align === "left" ? hf.margin : align === "right" ? size.w - hf.margin - w : (size.w - w) / 2;
        await drawText(cx, page, m, fitted(textObj({ text, x, y, size: hf.size, color: hf.color, font: hf.font }), fonts));
      }
    }
    if (wm.enabled && wmPages.has(i + 1)) {
      if (wm.kind === "text" && wm.text.trim()) {
        const t = fitted(textObj({ text: wm.text, x: 0, y: 0, size: wm.size, color: wm.color, opacity: wm.opacity, bold: wm.bold, rot: wm.rotation }), fonts);
        await drawText(cx, page, m, { ...t, x: (size.w - t.w) / 2, y: (size.h - t.h) / 2 });
      } else if (wm.kind === "image") {
        const a = assets.get(wm.imgId);
        if (a) { const w = Math.min(size.w * 0.6, a.w), h = (a.h / a.w) * w; await drawObject(cx, page, ps, m, { id: "wm", type: "image", imgId: wm.imgId, x: (size.w - w) / 2, y: (size.h - h) / 2, w, h, rot: wm.rotation, opacity: wm.opacity }, i); }
      }
    }
    if (ps.crop) {
      const c = ps.crop, a = m.toUser({ x: c.l, y: c.t }), b = m.toUser({ x: size.w - c.r, y: size.h - c.b });
      const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
      if (w > 10 && h > 10) page.setCropBox(x, y, w, h);
    }
  }
  resolvePageLinks(out, list, cx.pageLinks);

  // Fill in / flatten existing form fields
  const form = out.getForm();
  if (form.getFields().length) {
    for (const [name, val] of Object.entries(formValues)) {
      try {
        const f = form.getFieldMaybe(name);
        if (!f) continue;
        if (f instanceof PDFTextField) f.setText(String(val));
        else if (f instanceof PDFCheckBox) val ? f.check() : f.uncheck();
        else if (f instanceof PDFDropdown || f instanceof PDFRadioGroup || f instanceof PDFOptionList) { if (String(val)) f.select(String(val)); }
      } catch (e) { warnings.push(`Field “${name}” could not be filled (${(e as Error).message}).`); }
    }
    if (deletedOriginal > 0) { // drop fields whose widgets lived on deleted pages
      const live = new Set(out.getPages().map((p) => p.ref.toString()));
      for (const f of form.getFields()) if (f.acroField.getWidgets().some((w) => { const r = w.P(); return !r || !live.has(r.toString()); })) { try { form.acroForm.removeField(f.acroField); } catch { /* ignore */ } }
    }
    if (options.flattenForms || (deletedOriginal > 0 && form.getFields().length)) {
      try { form.flatten(); if (deletedOriginal > 0 && !options.flattenForms) warnings.push("Form fields were flattened because pages were deleted."); } catch (e) { warnings.push(`Form flattening failed (${(e as Error).message}).`); }
    }
  }
  out.setTitle(doc.meta.title); out.setAuthor(doc.meta.author); out.setSubject(doc.meta.subject);
  out.setKeywords(doc.meta.keywords.split(",").map((s) => s.trim()).filter(Boolean)); out.setCreator(doc.meta.creator || "ToolHub PDF Editor");
  out.setModificationDate(new Date());

  let final: PDFDocument = out;
  if (deletedOriginal > 0) { // copy into a fresh document so deleted pages (and their data) are not left inside the file
    say("Removing deleted pages…");
    final = await PDFDocument.create(); final.registerFontkit(fontkit);
    for (const p of await final.copyPages(out, out.getPageIndices())) final.addPage(p);
    final.setTitle(doc.meta.title); final.setAuthor(doc.meta.author); final.setSubject(doc.meta.subject);
    final.setKeywords(doc.meta.keywords.split(",").map((s) => s.trim()).filter(Boolean)); final.setCreator(doc.meta.creator || "ToolHub PDF Editor");
  }
  say("Saving…");
  let bytes = await final.save({ useObjectStreams: options.useObjectStreams });

  const redactPages = pages.map((p, i) => (p.objects.some((o) => o.type === "redact") ? i : -1)).filter((i) => i >= 0);
  if (options.permanentRedaction && redactPages.length) {
    if (typeof document === "undefined") warnings.push("Permanent redaction needs a browser; boxes were drawn but the text underneath remains.");
    else bytes = await flattenPages(bytes, redactPages, pages, doc.meta, say, warnings);
  }
  return { bytes, warnings: [...new Set(warnings)] };
}

function fitted(t: TextObj, fb: FontBook): TextObj { const l = layoutText(t, fb); return { ...t, w: l.w, h: l.h }; }

/** Re-render the listed pages to images so that anything under redaction boxes cannot be recovered. */
async function flattenPages(bytes: Uint8Array, idx: number[], pages: PageState[], meta: EditorDoc["meta"], say: (m: string) => void, warnings: string[]): Promise<Uint8Array> {
  const { getPdfjs } = await import("@/lib/pdfjs"), pdfjs = await getPdfjs();
  const src = await PDFDocument.load(bytes), view = await pdfjs.getDocument({ data: bytes.slice() }).promise, out = await PDFDocument.create(), S = 2.5, links: Ctx["pageLinks"] = [];
  for (let i = 0; i < src.getPageCount(); i++) {
    if (!idx.includes(i)) { const [p] = await out.copyPages(src, [i]); out.addPage(p); continue; }
    say(`Permanently redacting page ${i + 1}…`);
    const page = await view.getPage(i + 1), vp1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: S }), c = document.createElement("canvas");
    c.width = vp.width; c.height = vp.height;
    await page.render({ canvasContext: c.getContext("2d")!, viewport: vp, canvas: c }).promise;
    const jpg = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.92)), img = await out.embedJpg(await jpg.arrayBuffer());
    const np = out.addPage([vp1.width, vp1.height]); np.drawImage(img, { x: 0, y: 0, width: vp1.width, height: vp1.height });
    // the page is now a picture: bring its comments and links back as real annotations (the page is upright, so visual = user space)
    const flat: PageState = { ...pages[i], view: [0, 0, vp1.width, vp1.height], nativeRot: 0, extra: 0, crop: null };
    for (const o of pages[i].objects) if (o.type === "note" || o.type === "link") addAnnotation(out, np, pageMapper(flat), o, links);
  }
  resolvePageLinks(out, out.getPages(), links);
  out.setTitle(meta.title); out.setAuthor(meta.author); out.setSubject(meta.subject); out.setKeywords(meta.keywords.split(",").map((s) => s.trim()).filter(Boolean)); out.setCreator(meta.creator || "ToolHub PDF Editor");
  warnings.push(`Redacted page${idx.length > 1 ? "s" : ""} ${idx.map((i) => i + 1).join(", ")} saved as images (text on them is no longer selectable, and form fields there are flattened).`);
  return out.save();
}
