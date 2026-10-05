import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "node:fs";
import sharp from "sharp";
import { exportPdf } from "../components/editor/export";
import { FontBook, fitText } from "../components/editor/fonts";
import { defaultHF, defaultWatermark, type EditorDoc, type Obj, type PageState, type TextObj } from "../components/editor/types";

// --- source PDF: 3 pages, page 2 is rotated 90, page 3 has a form field
const src = await PDFDocument.create(), f = await src.embedFont(StandardFonts.Helvetica);
for (let i = 1; i <= 3; i++) { const p = src.addPage([400, 300]); p.drawText(`Original page ${i}`, { x: 40, y: 250, size: 20, font: f }); p.drawRectangle({ x: 20, y: 20, width: 360, height: 260, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 }); }
src.getPage(1).setRotation({ type: "degrees", angle: 90 } as never);
const form = src.getForm(), tf = form.createTextField("name"); tf.addToPage(src.getPage(2), { x: 40, y: 150, width: 200, height: 24 }); tf.setText("Ada");
const bytes = await src.save();

const fb = await FontBook.create();
const png = await sharp({ create: { width: 60, height: 40, channels: 4, background: { r: 220, g: 40, b: 40, alpha: 1 } } }).png().toBuffer();
const assets = new Map([["img1", { id: "img1", bytes: new Uint8Array(png), mime: "image/png" as const, url: "", w: 60, h: 40 }]]);

const T = (p: Partial<TextObj> & { text: string; x: number; y: number }): TextObj => fitText({ id: "t" + Math.random(), type: "text", w: 0, h: 0, rot: 0, opacity: 1, font: "helvetica", size: 14, color: "#000000", bold: false, italic: false, underline: false, strike: false, align: "left", lineHeight: 1.2, wrap: false, bg: null, ...p }, fb);
const base = { rot: 0, opacity: 1 };
const o1: Obj[] = [
  T({ text: "Hello World — bold italic underline", x: 40, y: 40, bold: true, italic: true, underline: true, color: "#cc0000" }),
  T({ text: "Times serif strike", x: 40, y: 64, font: "times", strike: true, size: 18 }),
  T({ text: "Courier mono text", x: 40, y: 90, font: "courier", size: 12, bg: "#ffff99" }),
  T({ text: "Wrapped text box that should wrap onto several lines because it is long", x: 220, y: 40, w: 150, wrap: true, size: 11, align: "center" }),
  T({ text: "Rotated 30°", x: 150, y: 150, rot: 30, size: 16, color: "#0044cc" }),
  { id: "r1", type: "rect", x: 40, y: 120, w: 80, h: 50, ...base, stroke: "#009900", strokeW: 2, fill: "#ccffcc", dash: "solid", radius: 0 },
  { id: "r2", type: "rect", x: 130, y: 120, w: 80, h: 50, ...base, stroke: "#990099", strokeW: 2, fill: null, dash: "dashed", radius: 12 },
  { id: "e1", type: "ellipse", x: 40, y: 190, w: 90, h: 50, ...base, stroke: "#ff6600", strokeW: 3, fill: "#ffe0cc", dash: "dotted", radius: 0, rot: 15 },
  { id: "l1", type: "line", x: 150, y: 200, w: 100, h: 30, rot: 0, opacity: 1, pts: [{ x: 150, y: 200 }, { x: 250, y: 230 }], stroke: "#000000", strokeW: 2, dash: "solid", head: "none" },
  { id: "a1", type: "arrow", x: 260, y: 200, w: 100, h: 30, rot: 0, opacity: 1, pts: [{ x: 260, y: 230 }, { x: 360, y: 200 }], stroke: "#cc0000", strokeW: 2, dash: "solid", head: "both" },
  { id: "i1", type: "ink", x: 0, y: 0, w: 0, h: 0, rot: 0, opacity: 1, strokes: [[{ x: 280, y: 100 }, { x: 290, y: 90 }, { x: 305, y: 110 }, { x: 320, y: 85 }, { x: 340, y: 105 }]], color: "#2222cc", strokeW: 2.5 },
  { id: "h1", type: "highlight", x: 40, y: 244, w: 120, h: 18, ...base, rects: [{ x: 40, y: 244, w: 120, h: 18 }], color: "#ffee00", opacity: 0.5 },
  { id: "u1", type: "underline", x: 40, y: 244, w: 120, h: 18, ...base, rects: [{ x: 40, y: 244, w: 120, h: 18 }], color: "#ff0000" },
  { id: "im1", type: "image", x: 300, y: 240, w: 60, h: 40, ...base, imgId: "img1" },
  { id: "c1", type: "cover", x: 40, y: 20, w: 0, h: 0, ...base, color: "#ffffff" },
  { id: "s1", type: "stamp", x: 250, y: 120, w: 0, h: 0, ...base, label: "APPROVED", color: "#008800", size: 16, rot: -15 },
  { id: "n1", type: "note", x: 370, y: 10, w: 22, h: 22, ...base, text: "A sticky note — with unicode ✓", color: "#ffcc00" },
  { id: "k1", type: "link", x: 40, y: 270, w: 80, h: 14, ...base, kind: "url", url: "https://example.com", page: 1, border: true },
  { id: "k2", type: "link", x: 130, y: 270, w: 80, h: 14, ...base, kind: "page", url: "", page: 3, border: true },
  { id: "f1", type: "field", x: 220, y: 270, w: 120, h: 18, ...base, kind: "text", name: "email", value: "me@x.com", multiline: false, fontSize: 10 },
  { id: "f2", type: "field", x: 350, y: 268, w: 16, h: 16, ...base, kind: "checkbox", name: "agree", value: "true", multiline: false, fontSize: 10 },
];
const mkPage = (i: number, objects: Obj[], extra: 0 | 90 = 0, nat = 0): PageState => ({ id: "p" + i + Math.random(), src: { doc: 0, index: i }, view: [0, 0, 400, 300], nativeRot: nat, extra: extra as 0, crop: null, objects });
const doc: EditorDoc = {
  pages: [mkPage(2, []), mkPage(0, o1), mkPage(0, [T({ text: "Duplicate of page 1", x: 40, y: 100, size: 20 })]), mkPage(1, [T({ text: "On rotated page", x: 40, y: 40, size: 18 }), { id: "q", type: "rect", x: 20, y: 80, w: 60, h: 40, ...base, stroke: "#ff0000", strokeW: 2, fill: null, dash: "solid", radius: 0 } as Obj], 0, 90)],
  meta: { title: "Test Doc", author: "Tester", subject: "S", keywords: "a, b", creator: "ToolHub" },
  watermark: { ...defaultWatermark(), enabled: true, text: "DRAFT", range: "2" }, hf: { ...defaultHF(), enabled: true, tl: "{title}", bc: "Page {page} of {pages}" },
};
const r = await exportPdf({ doc, sources: [{ name: "a.pdf", bytes: new Uint8Array(bytes) }], assets, fonts: fb, options: { flattenForms: false, permanentRedaction: false, useObjectStreams: true }, formValues: { name: "Grace" } });
fs.writeFileSync("/tmp/claude-0/ed/out1.pdf", r.bytes); console.log("warnings:", r.warnings);
const o = await PDFDocument.load(r.bytes); console.log("pages:", o.getPageCount(), "title:", o.getTitle(), "rot p4:", o.getPage(3).getRotation().angle, "fields:", o.getForm().getFields().map((x) => x.getName()).join(","));

// Delete-page prune test
const doc2: EditorDoc = { ...doc, pages: [mkPage(0, [])] };
const r2 = await exportPdf({ doc: doc2, sources: [{ name: "a.pdf", bytes: new Uint8Array(bytes) }], assets, fonts: fb, options: { flattenForms: false, permanentRedaction: false, useObjectStreams: true }, formValues: {} });
console.log("prune: pages", (await PDFDocument.load(r2.bytes)).getPageCount(), "size", bytes.length, "->", r2.bytes.length, r2.warnings);
