import { fitText, type FontBook } from "./fonts";
import { normRect } from "./geometry";
import { uid, type Dash, type FontKey, type Obj, type Pt, type Rect, type TextObj, type ToolId } from "./types";

export interface Styles {
  text: { font: FontKey; size: number; color: string; bold: boolean; italic: boolean; underline: boolean; strike: boolean; align: "left" | "center" | "right"; lineHeight: number; bg: string | null };
  shape: { stroke: string | null; strokeW: number; fill: string | null; dash: Dash; radius: number };
  line: { stroke: string; strokeW: number; dash: Dash; head: "none" | "end" | "both" };
  pen: { color: string; width: number };
  mark: { highlight: string; underline: string; strike: string; opacity: number };
  cover: { color: string };
  stamp: { label: string; color: string; size: number };
  note: { color: string };
  link: { kind: "url" | "page"; url: string; page: number; border: boolean };
  field: { name: string; multiline: boolean; fontSize: number };
}
export const defaultStyles = (): Styles => ({
  text: { font: "helvetica", size: 14, color: "#111827", bold: false, italic: false, underline: false, strike: false, align: "left", lineHeight: 1.2, bg: null },
  shape: { stroke: "#dc2626", strokeW: 2, fill: null, dash: "solid", radius: 0 },
  line: { stroke: "#dc2626", strokeW: 2, dash: "solid", head: "end" },
  pen: { color: "#1d4ed8", width: 2.5 },
  mark: { highlight: "#fde047", underline: "#dc2626", strike: "#dc2626", opacity: 0.6 },
  cover: { color: "#ffffff" },
  stamp: { label: "APPROVED", color: "#15803d", size: 22 },
  note: { color: "#fcd34d" },
  link: { kind: "url", url: "https://", page: 1, border: false },
  field: { name: "field", multiline: false, fontSize: 11 },
});

export const STAMPS: { label: string; color: string }[] = [
  { label: "APPROVED", color: "#15803d" }, { label: "REJECTED", color: "#b91c1c" }, { label: "DRAFT", color: "#6b7280" }, { label: "CONFIDENTIAL", color: "#b91c1c" },
  { label: "REVIEWED", color: "#1d4ed8" }, { label: "PAID", color: "#15803d" }, { label: "URGENT", color: "#c2410c" }, { label: "FINAL", color: "#4338ca" }, { label: "COPY", color: "#6b7280" },
];

const base = { rot: 0, opacity: 1 };

export function newText(p: Pt, s: Styles["text"], text: string, fb: FontBook, over: Partial<TextObj> = {}): TextObj {
  return fitText({ id: uid(), type: "text", x: p.x, y: p.y, w: 0, h: 0, ...base, text, ...s, wrap: false, ...over }, fb);
}

/** Min drag distance (pt) before a drag counts as drawing a shape. */
export const DRAG_MIN = 3;

/** Create an object for a drawing tool from a drag rectangle (or a default-sized one for a plain click). */
export function makeFromDrag(tool: ToolId, a: Pt, b: Pt, s: Styles, clicked: boolean): Obj | null {
  const id = uid();
  const r: Rect = clicked ? defaultRect(tool, a) : normRect(a, b);
  switch (tool) {
    case "rect": case "ellipse": return { id, type: tool, ...r, ...base, ...s.shape };
    case "line": case "arrow": {
      const q = clicked ? { x: a.x + 120, y: a.y } : b;
      return { id, type: tool, x: Math.min(a.x, q.x), y: Math.min(a.y, q.y), w: Math.abs(q.x - a.x), h: Math.abs(q.y - a.y), ...base, pts: [a, q], ...s.line, head: tool === "arrow" ? s.line.head : "none" };
    }
    case "cover": return { id, type: "cover", ...r, ...base, color: s.cover.color };
    case "redact": return { id, type: "redact", ...r, ...base, color: "#000000" };
    case "link": return { id, type: "link", ...r, ...base, ...s.link };
    case "field-text": return { id, type: "field", kind: "text", ...r, ...base, name: s.field.name, value: "", multiline: s.field.multiline, fontSize: s.field.fontSize };
    case "field-check": return { id, type: "field", kind: "checkbox", ...r, ...base, name: s.field.name, value: "", multiline: false, fontSize: s.field.fontSize };
    default: return null;
  }
}
function defaultRect(tool: ToolId, p: Pt): Rect {
  switch (tool) {
    case "rect": case "ellipse": return { x: p.x - 50, y: p.y - 30, w: 100, h: 60 };
    case "cover": case "redact": return { x: p.x - 60, y: p.y - 10, w: 120, h: 20 };
    case "link": return { x: p.x - 50, y: p.y - 9, w: 100, h: 18 };
    case "field-text": return { x: p.x - 70, y: p.y - 11, w: 140, h: 22 };
    case "field-check": return { x: p.x - 8, y: p.y - 8, w: 16, h: 16 };
    default: return { x: p.x, y: p.y, w: 100, h: 20 };
  }
}
