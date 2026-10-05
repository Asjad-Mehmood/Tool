// Data model for the PDF editor. All geometry is in PDF points (1/72 in), measured in the page's *visual* frame:
// origin at the top-left of the page as displayed (after rotation), y pointing down.

export type Id = string;
export type Rot = 0 | 90 | 180 | 270;
export type Dash = "solid" | "dashed" | "dotted";
/** "helvetica" | "times" | "courier" | `custom:${id}` */
export type FontKey = string;
export interface Rect { x: number; y: number; w: number; h: number }
export interface Pt { x: number; y: number }

export interface Box extends Rect {
  /** Clockwise degrees about the box centre. */
  rot: number;
  opacity: number;
  locked?: boolean;
}
interface Base extends Box { id: Id }

export interface TextObj extends Base {
  type: "text"; text: string; font: FontKey; size: number; color: string;
  bold: boolean; italic: boolean; underline: boolean; strike: boolean;
  align: "left" | "center" | "right"; lineHeight: number;
  /** false → box grows with the text; true → text wraps at `w`. */
  wrap: boolean; bg: string | null;
  /** When created by "edit existing text": the cover object hiding the original. */
  coverId?: Id;
}
export interface ShapeObj extends Base {
  type: "rect" | "ellipse"; stroke: string | null; strokeW: number; fill: string | null; dash: Dash; radius: number;
}
export interface LineObj extends Base {
  type: "line" | "arrow"; pts: [Pt, Pt]; stroke: string; strokeW: number; dash: Dash; head: "none" | "end" | "both";
}
export interface InkObj extends Base { type: "ink"; strokes: Pt[][]; color: string; strokeW: number }
export interface MarkObj extends Base { type: "highlight" | "underline" | "strike"; rects: Rect[]; color: string }
export interface ImageObj extends Base { type: "image"; imgId: string; kind?: "signature" | "image" }
export interface CoverObj extends Base { type: "cover" | "redact"; color: string }
export interface NoteObj extends Base { type: "note"; text: string; color: string }
export interface LinkObj extends Base { type: "link"; kind: "url" | "page"; url: string; page: number; border: boolean }
export interface StampObj extends Base { type: "stamp"; label: string; color: string; size: number }
export interface FieldObj extends Base { type: "field"; kind: "text" | "checkbox"; name: string; value: string; multiline: boolean; fontSize: number }

export type Obj = TextObj | ShapeObj | LineObj | InkObj | MarkObj | ImageObj | CoverObj | NoteObj | LinkObj | StampObj | FieldObj;
export type ObjType = Obj["type"];

export interface Crop { t: number; r: number; b: number; l: number }
export interface PageState {
  id: Id;
  /** null → blank page created in the editor (uses `view`). */
  src: { doc: number; index: number } | null;
  /** [x0, y0, x1, y1] visible area in PDF user space (the page's crop box ∩ media box). */
  view: [number, number, number, number];
  /** The page's own /Rotate. */
  nativeRot: number;
  /** Rotation the user added in the editor. */
  extra: Rot;
  crop: Crop | null;
  objects: Obj[];
}
export const pageRot = (p: PageState) => (((p.nativeRot + p.extra) % 360) + 360) % 360;
export function pageSize(p: PageState): { w: number; h: number } {
  const w = p.view[2] - p.view[0], h = p.view[3] - p.view[1];
  return pageRot(p) % 180 ? { w: h, h: w } : { w, h };
}

export interface Meta { title: string; author: string; subject: string; keywords: string; creator: string }
export interface Watermark { enabled: boolean; kind: "text" | "image"; text: string; imgId: string; size: number; color: string; opacity: number; rotation: number; range: string; bold: boolean }
export interface HeaderFooter { enabled: boolean; tl: string; tc: string; tr: string; bl: string; bc: string; br: string; size: number; color: string; margin: number; font: FontKey; range: string; startAt: number }
export interface EditorDoc { pages: PageState[]; meta: Meta; watermark: Watermark; hf: HeaderFooter }

export const defaultWatermark = (): Watermark => ({ enabled: false, kind: "text", text: "CONFIDENTIAL", imgId: "", size: 72, color: "#888888", opacity: 0.25, rotation: 45, range: "", bold: true });
export const defaultHF = (): HeaderFooter => ({ enabled: false, tl: "", tc: "", tr: "", bl: "", bc: "Page {page} of {pages}", br: "", size: 10, color: "#444444", margin: 28, font: "helvetica", range: "", startAt: 1 });

export type ToolId =
  | "select" | "text" | "edit" | "highlight" | "underline" | "strike" | "pen"
  | "rect" | "ellipse" | "line" | "arrow" | "image" | "signature" | "cover" | "redact" | "note" | "link" | "stamp" | "field-text" | "field-check";

export interface ImageAsset { id: string; bytes: Uint8Array; mime: "image/png" | "image/jpeg"; url: string; w: number; h: number }
export interface SourceDoc { name: string; bytes: Uint8Array }
export interface FormFieldInfo { name: string; kind: "text" | "checkbox" | "radio" | "dropdown" | "list" | "button" | "other"; value: string | boolean; options?: string[]; readOnly: boolean }
export type FormValues = Record<string, string | boolean>;

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
