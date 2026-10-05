import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { TextObj } from "./types";

type Style = "regular" | "bold" | "italic" | "boldItalic";
const STD: Record<string, Record<Style, StandardFonts>> = {
  helvetica: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold, italic: StandardFonts.HelveticaOblique, boldItalic: StandardFonts.HelveticaBoldOblique },
  times: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold, italic: StandardFonts.TimesRomanItalic, boldItalic: StandardFonts.TimesRomanBoldItalic },
  courier: { regular: StandardFonts.Courier, bold: StandardFonts.CourierBold, italic: StandardFonts.CourierOblique, boldItalic: StandardFonts.CourierBoldOblique },
};
export const STANDARD_FAMILIES = [{ key: "helvetica", label: "Helvetica (sans-serif)" }, { key: "times", label: "Times (serif)" }, { key: "courier", label: "Courier (monospace)" }];
const style = (b: boolean, i: boolean): Style => (b && i ? "boldItalic" : b ? "bold" : i ? "italic" : "regular");

export interface CustomFont { key: string; name: string; bytes: Uint8Array; family: string }

/** Measures text with the same metrics used when exporting, so the on-screen layout matches the saved PDF. */
export class FontBook {
  private doc!: PDFDocument;
  private cache = new Map<string, PDFFont>();
  customs = new Map<string, CustomFont>();

  static async create(): Promise<FontBook> {
    const fb = new FontBook();
    fb.doc = await PDFDocument.create();
    fb.doc.registerFontkit(fontkit);
    for (const fam of Object.keys(STD)) for (const s of Object.keys(STD[fam]) as Style[]) fb.cache.set(`${fam}:${s}`, await fb.doc.embedFont(STD[fam][s]));
    return fb;
  }

  /** Register a TTF/OTF. Returns its key, or throws if the font can't be read. */
  async addCustom(name: string, bytes: Uint8Array): Promise<CustomFont> {
    const key = `custom:${Math.random().toString(36).slice(2, 8)}`;
    this.cache.set(key, await this.doc.embedFont(bytes, { subset: false })); // throws on invalid fonts
    const family = `th-${key.slice(7)}`, cf: CustomFont = { key, name: name.replace(/\.(ttf|otf)$/i, ""), bytes, family };
    this.customs.set(key, cf);
    if (typeof document !== "undefined") { const ff = new FontFace(family, bytes.slice().buffer as ArrayBuffer); await ff.load(); document.fonts.add(ff); }
    return cf;
  }

  font(key: string, bold = false, italic = false): PDFFont {
    return this.cache.get(key.startsWith("custom:") ? key : `${STD[key] ? key : "helvetica"}:${style(bold, italic)}`) ?? this.cache.get("helvetica:regular")!;
  }
  width(key: string, bold: boolean, italic: boolean, text: string, size: number): number {
    try { return this.font(key, bold, italic).widthOfTextAtSize(text, size); } catch { return text.length * size * 0.55; }
  }
  /** Can this text be written with the font (standard fonts only cover WinAnsi)? */
  canEncode(key: string, bold: boolean, italic: boolean, text: string): boolean {
    try { this.font(key, bold, italic).encodeText(text); return true; } catch { return false; }
  }
  /** CSS font stack that looks like the PDF font on screen. */
  css(key: string): string {
    if (key.startsWith("custom:")) return `"${this.customs.get(key)?.family ?? "sans-serif"}", sans-serif`;
    return ({ helvetica: 'Helvetica, Arial, "Liberation Sans", "Nimbus Sans", sans-serif', times: '"Times New Roman", Times, "Liberation Serif", "Nimbus Roman", serif', courier: '"Courier New", Courier, "Liberation Mono", "Nimbus Mono PS", monospace' } as Record<string, string>)[key] ?? "sans-serif";
  }
  /** Standard-font map used when exporting (the export document embeds its own copies). */
  static standardName(key: string, bold: boolean, italic: boolean): StandardFonts { return STD[STD[key] ? key : "helvetica"][style(bold, italic)]; }
}

export interface LayoutLine { text: string; x: number; baseline: number; w: number }
export interface Layout { lines: LayoutLine[]; w: number; h: number; lh: number }

/** Line-break and align text. Baselines are measured from the top of the box. */
export function layoutText(o: Pick<TextObj, "text" | "font" | "size" | "bold" | "italic" | "align" | "lineHeight" | "wrap" | "w">, fb: FontBook): Layout {
  const wid = (t: string) => fb.width(o.font, o.bold, o.italic, t, o.size), limit = o.wrap ? Math.max(o.w, o.size) : Infinity;
  const raw: string[] = [];
  for (const para of o.text.replace(/\r/g, "").replace(/\t/g, "    ").split("\n")) {
    if (limit === Infinity) { raw.push(para); continue; }
    let cur = "";
    for (const word of para.split(" ")) {
      const t = cur ? `${cur} ${word}` : word;
      if (wid(t) <= limit || !cur && !word) { cur = t; continue; }
      if (cur) raw.push(cur);
      let w = word;
      while (wid(w) > limit && w.length > 1) { let k = w.length - 1; while (k > 1 && wid(w.slice(0, k)) > limit) k--; raw.push(w.slice(0, k)); w = w.slice(k); }
      cur = w;
    }
    raw.push(cur);
  }
  const lh = o.size * o.lineHeight, first = (lh - o.size) / 2 + o.size * 0.8;
  const widths = raw.map(wid), boxW = o.wrap ? Math.max(o.w, o.size) : Math.max(...widths, o.size * 0.5);
  const lines = raw.map((text, i) => ({ text, w: widths[i], baseline: first + i * lh, x: o.align === "center" ? (boxW - widths[i]) / 2 : o.align === "right" ? boxW - widths[i] : 0 }));
  return { lines, w: boxW, h: Math.max(1, raw.length) * lh, lh };
}

/** Return the text object with w/h updated to match its content. */
export function fitText(o: TextObj, fb: FontBook): TextObj {
  const l = layoutText(o, fb);
  return { ...o, w: o.wrap ? o.w : l.w, h: l.h };
}
