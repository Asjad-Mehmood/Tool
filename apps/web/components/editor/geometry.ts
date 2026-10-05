import type { Obj, Pt, Rect } from "./types";

export const rad = (d: number) => (d * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const round = (v: number, n = 2) => { const k = 10 ** n; return Math.round(v * k) / k; };
export const center = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Rotate point p clockwise by `d` degrees (y-down frame) around c. */
export function rotateAround(p: Pt, c: Pt, d: number): Pt {
  const a = rad(d), cos = Math.cos(a), sin = Math.sin(a), dx = p.x - c.x, dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}

/** The 4 corners of a (possibly rotated) box: TL, TR, BR, BL. */
export function corners(o: { x: number; y: number; w: number; h: number; rot: number }): Pt[] {
  const c = center(o);
  return [{ x: o.x, y: o.y }, { x: o.x + o.w, y: o.y }, { x: o.x + o.w, y: o.y + o.h }, { x: o.x, y: o.y + o.h }].map((p) => rotateAround(p, c, o.rot));
}
/** Axis-aligned bounds of a rotated box. */
export function bounds(o: { x: number; y: number; w: number; h: number; rot: number }): Rect {
  const cs = corners(o), xs = cs.map((p) => p.x), ys = cs.map((p) => p.y), x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
export const rectsOverlap = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const normRect = (a: Pt, b: Pt): Rect => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });
export const unionRect = (rs: Rect[]): Rect => {
  const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y));
  return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y };
};

/** Recompute x/y/w/h for objects defined by points or rects. */
export function refit(o: Obj): Obj {
  if (o.type === "line" || o.type === "arrow") { const r = normRect(o.pts[0], o.pts[1]); return { ...o, ...r, rot: 0 }; }
  if (o.type === "ink") { const all = o.strokes.flat(), xs = all.map((p) => p.x), ys = all.map((p) => p.y), pad = o.strokeW / 2; return { ...o, x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2, rot: 0 }; }
  if (o.type === "highlight" || o.type === "underline" || o.type === "strike") return { ...o, ...unionRect(o.rects), rot: 0 };
  return o;
}

export function translate(o: Obj, dx: number, dy: number): Obj {
  const mv = (p: Pt): Pt => ({ x: p.x + dx, y: p.y + dy });
  const base = { ...o, x: o.x + dx, y: o.y + dy };
  if (o.type === "line" || o.type === "arrow") return { ...(base as typeof o), pts: [mv(o.pts[0]), mv(o.pts[1])] };
  if (o.type === "ink") return { ...(base as typeof o), strokes: o.strokes.map((s) => s.map(mv)) };
  if (o.type === "highlight" || o.type === "underline" || o.type === "strike") return { ...(base as typeof o), rects: o.rects.map((r) => ({ ...r, x: r.x + dx, y: r.y + dy })) };
  return base as Obj;
}

/** Map an object's geometry from its old box to a new box (resize). Point-based objects are scaled; box-based just take the new box. */
export function reshape(o: Obj, nb: Rect): Obj {
  const sx = o.w ? nb.w / o.w : 1, sy = o.h ? nb.h / o.h : 1, mx = (p: Pt): Pt => ({ x: nb.x + (p.x - o.x) * sx, y: nb.y + (p.y - o.y) * sy });
  const base = { ...o, ...nb };
  if (o.type === "line" || o.type === "arrow") return { ...(base as typeof o), pts: [mx(o.pts[0]), mx(o.pts[1])] };
  if (o.type === "ink") return { ...(base as typeof o), strokes: o.strokes.map((s) => s.map(mx)) };
  if (o.type === "highlight" || o.type === "underline" || o.type === "strike") return { ...(base as typeof o), rects: o.rects.map((r) => ({ x: nb.x + (r.x - o.x) * sx, y: nb.y + (r.y - o.y) * sy, w: r.w * sx, h: r.h * sy })) };
  return base as Obj;
}

/** Rotate every object 90° clockwise/anticlockwise when the page itself is rotated, so content stays attached to the page. */
export function rotateObjectsWithPage(objs: Obj[], pageW: number, pageH: number, dir: 1 | -1): Obj[] {
  // visual (x,y) on a page of size (pageW,pageH) → cw: (pageH - y, x); ccw: (y, pageW - x)
  const pt = (p: Pt): Pt => (dir === 1 ? { x: pageH - p.y, y: p.x } : { x: p.y, y: pageW - p.x });
  return objs.map((o) => {
    const c = pt(center(o));
    if (o.type === "line" || o.type === "arrow") return refit({ ...o, pts: o.pts.map(pt) as [Pt, Pt] });
    if (o.type === "ink") return refit({ ...o, strokes: o.strokes.map((s) => s.map(pt)) });
    if (o.type === "highlight" || o.type === "underline" || o.type === "strike") {
      return refit({ ...o, rects: o.rects.map((r) => { const a = pt({ x: r.x, y: r.y }), b = pt({ x: r.x + r.w, y: r.y + r.h }); return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }; }) });
    }
    return { ...o, x: c.x - o.w / 2, y: c.y - o.h / 2, rot: (o.rot + (dir === 1 ? 90 : -90) + 360) % 360 } as Obj;
  });
}

export const hexToRgb01 = (hex: string): [number, number, number] => {
  const m = hex.replace("#", "").match(/^([\da-f]{3}|[\da-f]{6})$/i);
  if (!m) return [0, 0, 0];
  let h = m[1]; if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
};

/** Parse "1-3, 5, 8-" into a Set of 1-based page numbers; empty string means all pages. */
export function parseRange(spec: string, total: number): Set<number> {
  const s = new Set<number>();
  if (!spec.trim()) { for (let i = 1; i <= total; i++) s.add(i); return s; }
  for (const part of spec.split(",").map((x) => x.trim()).filter(Boolean)) {
    const m = part.match(/^(\d*)\s*-\s*(\d*)$/);
    if (m) { const a = m[1] ? +m[1] : 1, b = m[2] ? +m[2] : total; for (let i = a; i <= b; i++) if (i >= 1 && i <= total) s.add(i); }
    else if (/^\d+$/.test(part) && +part >= 1 && +part <= total) s.add(+part);
  }
  return s;
}
