"use client";
import { Download, FileUp, HelpCircle, Layers, Minus, PanelLeft, PanelRight, Plus, Redo2, Search, Undo2, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ExportDialog, HelpDialog, SignatureDialog } from "./Dialogs";
import Inspector from "./Inspector";
import { DocumentPanel, FindPanel, FormsPanel, LayersPanel, PagesPanel, type Hit } from "./Panels";
import { PageView, HANDLES } from "./PageView";
import Toolbar, { TOOLS } from "./Toolbar";
import { DRAG_MIN, defaultStyles, makeFromDrag, newText, type Styles } from "./defaults";
import { exportPdf } from "./export";
import { FontBook, fitText } from "./fonts";
import { bounds, center, clamp, deg, normRect, parseRange, rectsOverlap, reshape, rotateAround, rotateObjectsWithPage, translate, unionRect, refit, round } from "./geometry";
import { Sources, blankPdf, loadFormFields, loadMeta, matchRects, pagesForSource, sampleColors, type TextLine } from "./runtime";
import { useHistory } from "./store";
import { defaultHF, defaultWatermark, pageSize, uid, type Crop, type EditorDoc, type FormFieldInfo, type FormValues, type ImageAsset, type Obj, type PageState, type Pt, type Rect, type TextObj, type ToolId } from "./types";

const MAX_BYTES = 150 * 1024 * 1024;
const EMPTY: never[] = [];
type Sel = { pageId: string | null; ids: string[] };
type Tab = "pages" | "layers" | "find" | "forms" | "doc";
interface Drag { pageId: string; start: Pt; moved: boolean; move: (pt: Pt, e: PointerEvent) => void; up: (pt: Pt, e: PointerEvent, moved: boolean) => void }

const setObjects = (pageId: string, fn: (o: Obj[]) => Obj[]) => (d: EditorDoc): EditorDoc => ({ ...d, pages: d.pages.map((p) => (p.id === pageId ? { ...p, objects: fn(p.objects) } : p)) });
const cloneObj = (o: Obj, dx = 0, dy = 0): Obj => ({ ...translate(o, dx, dy), id: uid() }) as Obj;

/** Magnetic snapping to page edges/centre and to other objects. */
function snapMove(r: Rect, others: Rect[], size: { w: number; h: number }, th: number) {
  const xs = [0, size.w / 2, size.w, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])], ys = [0, size.h / 2, size.h, ...others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])];
  const mine = { x: [r.x, r.x + r.w / 2, r.x + r.w], y: [r.y, r.y + r.h / 2, r.y + r.h] };
  const best = (m: number[], c: number[]) => { let d = Infinity, at = 0; for (const a of m) for (const b of c) if (Math.abs(b - a) < Math.abs(d)) { d = b - a; at = b; } return Math.abs(d) <= th ? { d, at } : null; };
  const bx = best(mine.x, xs), by = best(mine.y, ys), guides: { x?: number; y?: number }[] = [];
  if (bx) guides.push({ x: bx.at }); if (by) guides.push({ y: by.at });
  return { dx: bx?.d ?? 0, dy: by?.d ?? 0, guides };
}

async function readImage(file: Blob): Promise<{ bytes: Uint8Array; mime: "image/png" | "image/jpeg"; w: number; h: number }> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" }), c = document.createElement("canvas");
  c.width = bmp.width; c.height = bmp.height; const g = c.getContext("2d")!;
  const png = file.type === "image/png" || file.type === "image/webp" || file.type === "image/gif";
  if (!png) { g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); }
  g.drawImage(bmp, 0, 0);
  const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), png ? "image/png" : "image/jpeg", 0.93));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: png ? "image/png" : "image/jpeg", w: bmp.width, h: bmp.height };
}
const dataUrlBytes = (u: string) => Uint8Array.from(atob(u.split(",")[1]), (c) => c.charCodeAt(0));

export default function PdfEditor() {
  const sRef = useRef<Sources | null>(null); if (!sRef.current) sRef.current = new Sources(); const sources = sRef.current;
  const [fb, setFb] = useState<FontBook | null>(null);
  useEffect(() => { FontBook.create().then(setFb); }, []);
  const H = useHistory<EditorDoc>(), doc = H.doc;
  const [assets] = useState(() => new Map<string, ImageAsset>()), [, bump] = useReducer((x: number) => x + 1, 0);
  const [fileName, setFileName] = useState("document"), [loading, setLoading] = useState(""), [error, setError] = useState("");
  const [tool, setToolState] = useState<ToolId>("select"), [styles, setStyles] = useState<Styles>(defaultStyles);
  const [sel, setSel] = useState<Sel>({ pageId: null, ids: [] }), [zoom, setZoom] = useState(1), [curIdx, setCurIdx] = useState(0), [tab, setTab] = useState<Tab>("pages"), [selPages, setSelPages] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ pageId: string; id: string; isNew: boolean; original: string } | null>(null);
  const [hover, setHover] = useState<{ pageId: string; rect: Rect } | null>(null), [marquee, setMarquee] = useState<{ pageId: string; rect: Rect } | null>(null), [guides, setGuides] = useState<{ pageId: string; g: { x?: number; y?: number }[] } | null>(null);
  const [placing, setPlacing] = useState<{ imgId: string; kind: "image" | "signature" } | null>(null), [sigs, setSigs] = useState<string[]>([]);
  const [dialog, setDialog] = useState<null | "sig" | "export" | "help">(null), [toast, setToast] = useState("");
  const [hits, setHits] = useState<Hit[]>([]), [activeHit, setActiveHit] = useState(0), [findBusy, setFindBusy] = useState(false);
  const [formFields, setFormFields] = useState<FormFieldInfo[]>([]), [formValues, setFormValues] = useState<FormValues>({}), [flatten, setFlatten] = useState(false);
  const [cropPrev, setCropPrev] = useState<Crop | null>(null), [panel, setPanel] = useState<null | "left" | "right">(null);
  const [exp, setExp] = useState<{ busy: string; error: string; result: { name: string; size: number; warnings: string[]; url: string } | null; scopeIds?: string[] }>({ busy: "", error: "", result: null });

  // Latest-value refs so window-level handlers and stable callbacks never go stale.
  const R = useRef({ doc, tool, styles, sel, zoom, fb, editing, placing, curIdx, selPages, hits, activeHit });
  R.current = { doc, tool, styles, sel, zoom, fb, editing, placing, curIdx, selPages, hits, activeHit };
  const canvases = useRef(new Map<string, HTMLCanvasElement>()), scrollRef = useRef<HTMLDivElement>(null), drag = useRef<Drag | null>(null), clip = useRef<Obj[]>([]), nudge = useRef<ReturnType<typeof setTimeout> | null>(null);
  const files = { open: useRef<HTMLInputElement>(null), pdf: useRef<HTMLInputElement>(null), img: useRef<HTMLInputElement>(null), wm: useRef<HTMLInputElement>(null), font: useRef<HTMLInputElement>(null) };
  const fontTarget = useRef<"selection" | "style">("style");
  const say = (m: string) => { setToast(m); window.setTimeout(() => setToast((t) => (t === m ? "" : t)), 3500); };
  const dirty = H.canUndo;

  const pageById = (id: string) => R.current.doc?.pages.find((p) => p.id === id);
  const toPt = (e: { clientX: number; clientY: number }, pageId: string): Pt | null => {
    const svg = document.querySelector(`[data-page-id="${pageId}"] svg`), pg = pageById(pageId); if (!svg || !pg) return null;
    const r = svg.getBoundingClientRect(), s = pageSize(pg); return { x: ((e.clientX - r.left) / r.width) * s.w, y: ((e.clientY - r.top) / r.height) * s.h };
  };
  const setTool = useCallback((t: ToolId) => {
    setToolState(t); setHover(null);
    if (t !== "select") setSel((s) => (s.ids.length ? { pageId: null, ids: [] } : s));
    if (t === "image" && !R.current.placing) files.img.current?.click();
    if (t === "signature") { const last = sigs[sigs.length - 1]; if (last && assets.has(last)) setPlacing({ imgId: last, kind: "signature" }); else setDialog("sig"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sigs]);

  /* ---------- document loading ---------- */
  const resetEditor = () => { sources.destroy(); setSel({ pageId: null, ids: [] }); setSelPages([]); setHits([]); setEditing(null); setPlacing(null); setFormValues({}); setFlatten(false); setCropPrev(null); setToolState("select"); };
  const afterLoad = (pages: PageState[]) => { setCurIdx(0); setTimeout(() => { const el = scrollRef.current; if (!el) return; const maxW = Math.max(...pages.map((p) => pageSize(p).w)); setZoom(clamp((el.clientWidth - 72) / maxW, 0.3, 2)); }, 30); };
  const openBytes = async (name: string, bytes: Uint8Array) => {
    setError(""); setLoading("Opening…");
    try {
      if (bytes.length > MAX_BYTES) throw new Error("This PDF is larger than 150 MB — use a smaller file.");
      const meta = await loadMeta(bytes).catch((e: Error) => { throw new Error(/encrypt/i.test(e.message) ? "This PDF is password-protected. Remove the password with the Unlock PDF tool first, then open it here." : "This file couldn’t be read as a PDF — it may be damaged. Try Repair PDF."); });
      resetEditor();
      const { doc: di, numPages } = await sources.add(name, bytes), pages = await pagesForSource(sources, di, numPages);
      H.reset({ pages, meta, watermark: defaultWatermark(), hf: defaultHF() });
      setFileName(name.replace(/\.pdf$/i, "")); setFormFields(await loadFormFields(bytes)); afterLoad(pages);
    } catch (e) { setError((e as Error).message); }
    setLoading("");
  };
  const openFile = async (f: File | undefined) => { if (!f) return; if (dirty && !confirm("You have unsaved changes. Open another PDF and discard them?")) return; await openBytes(f.name, new Uint8Array(await f.arrayBuffer())); };
  const startBlank = async () => { if (dirty && !confirm("Discard your unsaved changes?")) return; await openBytes("blank.pdf", await blankPdf()); };
  const insertPdf = async (f: File | undefined) => {
    if (!f || !R.current.doc) return;
    try {
      const bytes = new Uint8Array(await f.arrayBuffer()); await loadMeta(bytes);
      const { doc: di, numPages } = await sources.add(f.name, bytes), pages = await pagesForSource(sources, di, numPages), at = Math.min(R.current.curIdx + 1, R.current.doc.pages.length);
      H.commit((d) => ({ ...d, pages: [...d.pages.slice(0, at), ...pages, ...d.pages.slice(at)] })); say(`Inserted ${numPages} page${numPages === 1 ? "" : "s"} after page ${at}.`);
    } catch { say("That file couldn’t be read as a PDF."); }
  };

  /* ---------- assets ---------- */
  const addAsset = (bytes: Uint8Array, mime: "image/png" | "image/jpeg", w: number, h: number): ImageAsset => {
    const a: ImageAsset = { id: uid(), bytes, mime, w, h, url: URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime })) }; assets.set(a.id, a); bump(); return a;
  };
  useEffect(() => { // restore saved signatures
    try { const raw: string[] = JSON.parse(localStorage.getItem("toolhub:sigs") ?? "[]"), ids: string[] = []; for (const u of raw.slice(-4)) { const img = new Image(); img.src = u; const a = addAsset(dataUrlBytes(u), "image/png", 300, 100); img.onload = () => { a.w = img.width; a.h = img.height; }; ids.push(a.id); } setSigs(ids); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const saveSigs = (ids: string[]) => { try { localStorage.setItem("toolhub:sigs", JSON.stringify(ids.map((i) => { const a = assets.get(i); return a ? `data:image/png;base64,${btoa(String.fromCharCode(...a.bytes))}` : null; }).filter(Boolean).slice(-4))); } catch { /* storage full/blocked */ } };
  const onSignature = async (url: string) => {
    const blob = await (await fetch(url)).blob(), im = await readImage(blob), a = addAsset(im.bytes, "image/png", im.w, im.h), ids = [...sigs, a.id].slice(-4);
    setSigs(ids); saveSigs(ids); setPlacing({ imgId: a.id, kind: "signature" }); setToolState("signature"); setDialog(null); say("Click on the page where the signature should go.");
  };

  /* ---------- selection helpers ---------- */
  const selPage = sel.pageId ? doc?.pages.find((p) => p.id === sel.pageId) : undefined;
  const selObjs = useMemo(() => (selPage ? selPage.objects.filter((o) => sel.ids.includes(o.id)) : EMPTY), [selPage, sel.ids]);
  const select = (pageId: string, ids: string[]) => setSel({ pageId, ids });
  const clearSel = () => setSel((s) => (s.ids.length ? { pageId: null, ids: [] } : s));
  const curPage = doc?.pages[curIdx];

  /* ---------- drag plumbing ---------- */
  useEffect(() => {
    const mv = (e: PointerEvent) => {
      const d = drag.current; if (!d) return;
      const pt = toPt(e, d.pageId); if (!pt) return;
      if (!d.moved && Math.hypot(pt.x - d.start.x, pt.y - d.start.y) * R.current.zoom >= DRAG_MIN) d.moved = true;
      if (d.moved) d.move(pt, e);
    };
    const up = (e: PointerEvent) => { const d = drag.current; if (!d) return; drag.current = null; d.up(toPt(e, d.pageId) ?? d.start, e, d.moved); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const startDrag = (d: Omit<Drag, "moved">) => { drag.current = { ...d, moved: false }; };

  /* ---------- creating objects ---------- */
  const addLive = (pageId: string, o: Obj) => H.live(setObjects(pageId, (l) => (l.some((x) => x.id === o.id) ? l.map((x) => (x.id === o.id ? o : x)) : [...l, o])));

  const finishEditing = () => {
    const ed = R.current.editing; if (!ed) return; setEditing(null);
    const pg = pageById(ed.pageId), o = pg?.objects.find((x) => x.id === ed.id) as TextObj | undefined;
    if (!o) { H.endLive(); return; }
    if (!o.text.trim()) { if (ed.isNew) { H.cancelLive(); clearSel(); } else { H.live(setObjects(ed.pageId, (l) => l.filter((x) => x.id !== ed.id))); H.endLive(); clearSel(); } return; }
    if (o.text === ed.original && !ed.isNew) H.cancelLive(); else H.endLive();
  };

  const createEditFromLine = (page: PageState, line: TextLine) => {
    const f = R.current.fb!, cv = canvases.current.get(page.id), s = pageSize(page), { bg, fg } = sampleColors(cv, cv ? cv.width / s.w : 1, { x: line.x, y: line.y, w: line.w, h: line.h });
    const cover: Obj = { id: uid(), type: "cover", x: line.x - 1, y: line.baseline - line.size * 0.85, w: line.w + 2, h: line.size * 1.1, rot: 0, opacity: 1, color: bg };
    const t = newText({ x: line.x, y: line.baseline - line.size * 0.8 }, { font: line.font, size: round(line.size, 1), color: fg, bold: line.bold, italic: line.italic, underline: false, strike: false, align: "left", lineHeight: 1, bg: null }, line.text, f, { coverId: cover.id });
    H.live(setObjects(page.id, (l) => [...l, cover, t])); select(page.id, [t.id]); setEditing({ pageId: page.id, id: t.id, isNew: false, original: line.text });
  };

  const readingOrderRects = async (page: PageState, a: Pt, b: Pt): Promise<Rect[]> => {
    const lines = (await sources.lines(page)).slice().sort((p, q) => (Math.abs(p.baseline - q.baseline) < Math.min(p.size, q.size) * 0.4 ? p.x - q.x : p.baseline - q.baseline));
    const at = (p: Pt) => { let bi = -1, bd = Infinity; lines.forEach((l, i) => { const dy = p.y < l.y ? l.y - p.y : p.y > l.y + l.h ? p.y - (l.y + l.h) : 0, dx = p.x < l.x ? l.x - p.x : p.x > l.x + l.w ? p.x - (l.x + l.w) : 0, d = dy * 3 + dx; if (d < bd) { bd = d; bi = i; } }); return bd < 40 ? bi : -1; };
    let i0 = at(a), i1 = at(b);
    if (i0 < 0 || i1 < 0) { // fall back to every line the dragged box touches
      const m = normRect(a, b), out: Rect[] = [];
      for (const l of lines) { const ov = rectsOverlap(m, { x: l.x, y: l.y, w: l.w, h: l.h }); if (ov) { const x0 = Math.max(l.x, m.x), x1 = Math.min(l.x + l.w, m.x + m.w); if (x1 > x0) out.push({ x: x0, y: l.y, w: x1 - x0, h: l.h }); } }
      return out;
    }
    let pa = a, pb = b; if (i0 > i1 || (i0 === i1 && a.x > b.x)) { [i0, i1] = [i1, i0]; [pa, pb] = [b, a]; }
    const out: Rect[] = [];
    for (let i = i0; i <= i1; i++) { const l = lines[i], x0 = i === i0 ? clamp(pa.x, l.x, l.x + l.w) : l.x, x1 = i === i1 ? clamp(pb.x, l.x, l.x + l.w) : l.x + l.w; if (x1 - x0 > 0.5) out.push({ x: x0, y: l.y, w: x1 - x0, h: l.h }); }
    return out;
  };

  /* ---------- pointer handlers (page level) ---------- */
  const onPageDown = (e: React.PointerEvent, page: PageState) => {
    if (e.button !== 0) return;
    const pt = toPt(e, page.id); if (!pt || !R.current.fb) return;
    const idx = R.current.doc!.pages.findIndex((p) => p.id === page.id); setCurIdx(idx);
    const t = R.current.tool, st = R.current.styles;
    if (R.current.editing) { finishEditing(); if (t === "select" || t === "text") return; }
    switch (t) {
      case "select": {
        if (!e.shiftKey) clearSel();
        const base = e.shiftKey && R.current.sel.pageId === page.id ? R.current.sel.ids : [];
        startDrag({ pageId: page.id, start: pt, move: (p2) => setMarquee({ pageId: page.id, rect: normRect(pt, p2) }),
          up: (p2, _e, moved) => { setMarquee(null); if (!moved) return; const m = normRect(pt, p2), ids = pageById(page.id)!.objects.filter((o) => rectsOverlap(m, bounds(o))).map((o) => o.id); select(page.id, [...new Set([...base, ...ids])]); } });
        return;
      }
      case "text": { const o = newText(pt, st.text, "", R.current.fb, { text: "" }); H.live(setObjects(page.id, (l) => [...l, o])); select(page.id, [o.id]); setEditing({ pageId: page.id, id: o.id, isNew: true, original: "" }); setToolState("select"); return; }
      case "edit": {
        sources.lines(page).then((lines) => {
          const hit = lines.filter((l) => pt.x >= l.x - 3 && pt.x <= l.x + l.w + 3 && pt.y >= l.y - 2 && pt.y <= l.y + l.h + 2).sort((a, b) => a.w * a.h - b.w * b.h)[0];
          if (!hit) { say(page.src ? "No editable text there. Use Add text to type new text." : "This page has no existing text."); return; }
          createEditFromLine(page, hit);
        }); return;
      }
      case "pen": {
        const id = uid(), strokes: Pt[] = [pt], mk = () => refit({ id, type: "ink", x: 0, y: 0, w: 0, h: 0, rot: 0, opacity: 1, strokes: [strokes.slice()], color: st.pen.color, strokeW: st.pen.width }) as Obj;
        H.live(setObjects(page.id, (l) => [...l, mk()]));
        startDrag({ pageId: page.id, start: pt, move: (p2) => { const last = strokes[strokes.length - 1]; if (Math.hypot(p2.x - last.x, p2.y - last.y) < 0.7) return; strokes.push(p2); addLive(page.id, mk()); }, up: () => H.endLive() });
        return;
      }
      case "highlight": case "underline": case "strike": {
        startDrag({ pageId: page.id, start: pt, move: (p2) => setMarquee({ pageId: page.id, rect: normRect(pt, p2) }),
          up: async (p2, _e, moved) => {
            setMarquee(null); let rects = moved ? await readingOrderRects(page, pt, p2) : [];
            if (!rects.length && moved) { const m = normRect(pt, p2); rects = m.w > 2 && m.h > 2 ? [m] : []; }
            if (!rects.length) { say("Drag across the text you want to mark."); return; }
            const o = refit({ id: uid(), type: t, x: 0, y: 0, w: 0, h: 0, rot: 0, opacity: t === "highlight" ? st.mark.opacity : 1, rects, color: st.mark[t] }) as Obj;
            H.commit(setObjects(page.id, (l) => [...l, o]));
          } });
        return;
      }
      case "rect": case "ellipse": case "line": case "arrow": case "cover": case "redact": case "link": case "field-text": {
        let id = "";
        const make = (b: Pt, clicked: boolean, shift: boolean) => {
          let end = b;
          if (shift && !clicked) { const dx = b.x - pt.x, dy = b.y - pt.y; if (t === "rect" || t === "ellipse") { const m = Math.max(Math.abs(dx), Math.abs(dy)); end = { x: pt.x + Math.sign(dx || 1) * m, y: pt.y + Math.sign(dy || 1) * m }; } else if (t === "line" || t === "arrow") { const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * (Math.PI / 12), L = Math.hypot(dx, dy); end = { x: pt.x + L * Math.cos(a), y: pt.y + L * Math.sin(a) }; } }
          const o = makeFromDrag(t, pt, end, st, clicked); if (!o) return null; if (!id) id = o.id; return { ...o, id } as Obj;
        };
        startDrag({ pageId: page.id, start: pt, move: (p2, ev) => { const o = make(p2, false, ev.shiftKey); if (o) addLive(page.id, o); },
          up: (_p, _e, moved) => { if (!moved) { const o = make(pt, true, false); if (o) addLive(page.id, o); } H.endLive(); if (id) select(page.id, [id]); setToolState("select"); } });
        return;
      }
      case "field-check": case "note": case "stamp": case "image": case "signature": {
        let o: Obj | null = null; const f = R.current.fb;
        if (t === "field-check") o = makeFromDrag("field-check", pt, pt, st, true);
        else if (t === "note") o = { id: uid(), type: "note", x: pt.x, y: pt.y, w: 22, h: 22, rot: 0, opacity: 1, text: "", color: st.note.color };
        else if (t === "stamp") { const w = f.width("helvetica", true, false, st.stamp.label, st.stamp.size) + st.stamp.size * 0.7, h = st.stamp.size * 1.6; o = { id: uid(), type: "stamp", x: pt.x - w / 2, y: pt.y - h / 2, w, h, rot: -12, opacity: 1, ...st.stamp }; }
        else { const pl = R.current.placing, a = pl && assets.get(pl.imgId); if (!a) { if (t === "image") files.img.current?.click(); else setDialog("sig"); return; } const w = Math.min(t === "signature" ? 150 : 240, a.w), h = (a.h / a.w) * w; o = { id: uid(), type: "image", imgId: a.id, kind: t === "signature" ? "signature" : "image", x: pt.x - w / 2, y: pt.y - h / 2, w, h, rot: 0, opacity: 1 }; }
        if (!o) return;
        H.commit(setObjects(page.id, (l) => [...l, o!])); select(page.id, [o.id]); setToolState("select"); if (t === "image") setPlacing(null); return;
      }
    }
  };

  const onPageMove = (e: React.PointerEvent, page: PageState) => {
    if (R.current.tool !== "edit" || drag.current) return;
    const pt = toPt(e, page.id); if (!pt) return;
    sources.lines(page).then((lines) => { const hit = lines.filter((l) => pt.x >= l.x - 3 && pt.x <= l.x + l.w + 3 && pt.y >= l.y - 2 && pt.y <= l.y + l.h + 2).sort((a, b) => a.w * a.h - b.w * b.h)[0]; setHover(hit ? { pageId: page.id, rect: { x: hit.x, y: hit.y, w: hit.w, h: hit.h } } : null); });
  };

  const onObjDown = (e: React.PointerEvent, page: PageState, obj: Obj) => {
    if (e.button !== 0 || !R.current.fb) return;
    if (R.current.editing) finishEditing();
    const additive = e.shiftKey || e.ctrlKey || e.metaKey, cur = R.current.sel;
    let ids = cur.pageId === page.id ? cur.ids : [];
    if (additive) { ids = ids.includes(obj.id) ? ids.filter((i) => i !== obj.id) : [...ids, obj.id]; select(page.id, ids); if (!ids.includes(obj.id)) return; }
    else if (!ids.includes(obj.id)) { ids = [obj.id]; select(page.id, ids); }
    setCurIdx(R.current.doc!.pages.findIndex((p) => p.id === page.id));
    const objs = pageById(page.id)!.objects, orig = objs.filter((o) => ids.includes(o.id) && !o.locked); if (!orig.length) return;
    const start = toPt(e, page.id)!, size = pageSize(page), others = objs.filter((o) => !ids.includes(o.id)).map(bounds), ub = unionRect(orig.map(bounds));
    startDrag({ pageId: page.id, start, move: (pt, ev) => {
      let dx = pt.x - start.x, dy = pt.y - start.y;
      if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      if (!ev.altKey) { const s = snapMove({ ...ub, x: ub.x + dx, y: ub.y + dy }, others, size, 5 / R.current.zoom); dx += s.dx; dy += s.dy; setGuides({ pageId: page.id, g: s.guides }); } else setGuides(null);
      H.live(setObjects(page.id, (l) => l.map((o) => { const q = orig.find((x) => x.id === o.id); return q ? translate(q, dx, dy) : o; })));
    }, up: () => { setGuides(null); H.endLive(); } });
  };

  const onHandleDown = (e: React.PointerEvent, page: PageState, obj: Obj, handle: string) => {
    if (e.button !== 0) return;
    const start = toPt(e, page.id)!, o0 = obj, c = center(o0), put = (o: Obj) => H.live(setObjects(page.id, (l) => l.map((x) => (x.id === o.id ? o : x))));
    if (handle === "rot") { startDrag({ pageId: page.id, start, move: (pt, ev) => { let a = (deg(Math.atan2(pt.y - c.y, pt.x - c.x)) + 90 + 360) % 360; if (ev.shiftKey) a = Math.round(a / 15) * 15 % 360; else for (const s of [0, 90, 180, 270, 45, 135, 225, 315]) if (Math.abs(a - s) < 3) a = s; put({ ...o0, rot: round(a, 1) } as Obj); }, up: () => H.endLive() }); return; }
    if ((o0.type === "line" || o0.type === "arrow") && handle[0] === "p") {
      const i = +handle[1], other = o0.pts[1 - i];
      startDrag({ pageId: page.id, start, move: (pt, ev) => { let q = pt; if (ev.shiftKey) { const a = Math.round(Math.atan2(pt.y - other.y, pt.x - other.x) / (Math.PI / 12)) * (Math.PI / 12), L = Math.hypot(pt.x - other.x, pt.y - other.y); q = { x: other.x + L * Math.cos(a), y: other.y + L * Math.sin(a) }; } const pts = (i === 0 ? [q, other] : [other, q]) as [Pt, Pt]; put(refit({ ...o0, pts } as Obj)); }, up: () => H.endLive() }); return;
    }
    const [dx, dy] = HANDLES[handle], corner = dx !== 0 && dy !== 0, ang = o0.rot;
    startDrag({ pageId: page.id, start, move: (pt, ev) => {
      const q = rotateAround(pt, c, -ang), lx = q.x - c.x, ly = q.y - c.y, hw = o0.w / 2, hh = o0.h / 2, MIN = 6;
      let l = dx === -1 ? lx : -hw, r = dx === 1 ? lx : hw, t = dy === -1 ? ly : -hh, b = dy === 1 ? ly : hh;
      if (r - l < MIN) { if (dx === -1) l = r - MIN; else r = l + MIN; } if (b - t < MIN) { if (dy === -1) t = b - MIN; else b = t + MIN; }
      if (corner && (o0.type === "image" || o0.type === "text" || ev.shiftKey) && !(o0.type === "image" && ev.shiftKey)) {
        const ratio = o0.w / o0.h, nw = r - l, nh = b - t;
        if (nw / nh > ratio) { const w2 = nh * ratio; if (dx === -1) l = r - w2; else r = l + w2; } else { const h2 = nw / ratio; if (dy === -1) t = b - h2; else b = t + h2; }
      }
      const nc = rotateAround({ x: c.x + (l + r) / 2, y: c.y + (t + b) / 2 }, c, ang), w = r - l, h = b - t;
      if (o0.type === "text") {
        const f = R.current.fb!;
        if (corner) { const size = clamp(o0.size * (w / o0.w), 4, 400), n = fitText({ ...o0, size }, f); put({ ...n, x: nc.x - n.w / 2, y: nc.y - n.h / 2 }); }
        else { const n = fitText({ ...o0, wrap: true, w }, f); put({ ...n, x: nc.x - w / 2, y: o0.y }); }
        return;
      }
      put(reshape(o0, { x: nc.x - w / 2, y: nc.y - h / 2, w, h }));
    }, up: () => H.endLive() });
  };

  const onObjDouble = (page: PageState, o: Obj) => {
    if (o.type === "text" && !o.locked) { select(page.id, [o.id]); setEditing({ pageId: page.id, id: o.id, isNew: false, original: o.text }); }
    else if (o.type === "note") { select(page.id, [o.id]); setPanel("right"); }
  };

  /* ---------- inspector actions ---------- */
  const patch = (fn: (o: Obj) => Obj, live = false) => { const s = R.current.sel; if (!s.pageId) return; (live ? H.live : H.commit)(setObjects(s.pageId, (l) => l.map((o) => (s.ids.includes(o.id) ? fn(o) : o)))); };
  const fit = (t: TextObj) => fitText(t, R.current.fb!);
  const reorder = (kind: "front" | "back" | "forward" | "backward") => {
    const s = R.current.sel; if (!s.pageId) return;
    H.commit(setObjects(s.pageId, (l) => {
      const chosen = l.filter((o) => s.ids.includes(o.id)), rest = l.filter((o) => !s.ids.includes(o.id));
      if (kind === "front") return [...rest, ...chosen]; if (kind === "back") return [...chosen, ...rest];
      const out = [...l]; const idx = out.map((o, i) => (s.ids.includes(o.id) ? i : -1)).filter((i) => i >= 0);
      if (kind === "forward") for (const i of idx.reverse()) { if (i < out.length - 1 && !s.ids.includes(out[i + 1].id)) [out[i], out[i + 1]] = [out[i + 1], out[i]]; }
      else for (const i of idx) { if (i > 0 && !s.ids.includes(out[i - 1].id)) [out[i], out[i - 1]] = [out[i - 1], out[i]]; }
      return out;
    }));
  };
  const action = (a: string) => {
    const s = R.current.sel, pg = s.pageId ? pageById(s.pageId) : undefined; if (!pg || !s.ids.length) return;
    const chosen = pg.objects.filter((o) => s.ids.includes(o.id));
    if (a === "delete") { H.commit(setObjects(pg.id, (l) => l.filter((o) => !s.ids.includes(o.id)))); clearSel(); }
    else if (a === "duplicate") { const copies = chosen.map((o) => cloneObj(o, 14, 14)); H.commit(setObjects(pg.id, (l) => [...l, ...copies])); select(pg.id, copies.map((c) => c.id)); }
    else if (a === "lock") { const lock = !chosen.every((o) => o.locked); patch((o) => ({ ...o, locked: lock })); }
    else if (a === "revert") { const t = chosen[0]; if (t.type === "text" && t.coverId) { H.commit(setObjects(pg.id, (l) => l.filter((o) => o.id !== t.id && o.id !== t.coverId))); clearSel(); } }
    else if (["front", "back", "forward", "backward"].includes(a)) reorder(a as "front");
    else if (a.startsWith("align:") || a.startsWith("dist:")) {
      const b = chosen.map((o) => ({ o, r: bounds(o) })), u = unionRect(b.map((x) => x.r)), kind = a.split(":")[1], moves = new Map<string, [number, number]>();
      if (a.startsWith("align:")) for (const { o, r } of b) moves.set(o.id, kind === "left" ? [u.x - r.x, 0] : kind === "right" ? [u.x + u.w - (r.x + r.w), 0] : kind === "hcenter" ? [u.x + u.w / 2 - (r.x + r.w / 2), 0] : kind === "top" ? [0, u.y - r.y] : kind === "bottom" ? [0, u.y + u.h - (r.y + r.h)] : [0, u.y + u.h / 2 - (r.y + r.h / 2)]);
      else { const h = kind === "h", sorted = [...b].sort((p, q) => (h ? p.r.x - q.r.x : p.r.y - q.r.y)), total = h ? u.w - sorted.reduce((n, x) => n + x.r.w, 0) : u.h - sorted.reduce((n, x) => n + x.r.h, 0), gap = total / (sorted.length - 1); let pos = h ? u.x : u.y; for (const { o, r } of sorted) { moves.set(o.id, h ? [pos - r.x, 0] : [0, pos - r.y]); pos += (h ? r.w : r.h) + gap; } }
      H.commit(setObjects(pg.id, (l) => l.map((o) => { const m = moves.get(o.id); return m ? translate(o, m[0], m[1]) : o; })));
    }
    else if (a.startsWith("move:")) { const [, dx, dy] = a.split(":").map(Number); if (!dx && !dy) return; H.live(setObjects(pg.id, (l) => l.map((o) => (s.ids.includes(o.id) && !o.locked ? translate(o, dx, dy) : o)))); }
    else if (a.startsWith("size:")) { const [, w, h] = a.split(":").map(Number); const o = chosen[0]; if (!o || !(w > 0) || !(h > 0)) return; H.live(setObjects(pg.id, (l) => l.map((x) => (x.id === o.id ? (x.type === "text" ? fitText({ ...x, wrap: true, w }, R.current.fb!) : reshape(x, { x: x.x, y: x.y, w, h })) : x)))); }
  };

  /* ---------- page operations ---------- */
  const pageOps = {
    rotate: (dir: 1 | -1) => { const ids = new Set(R.current.selPages.length ? R.current.selPages : curPage ? [curPage.id] : []); H.commit((d) => ({ ...d, pages: d.pages.map((p) => { if (!ids.has(p.id)) return p; const s = pageSize(p); return { ...p, extra: ((((p.extra + dir * 90) % 360) + 360) % 360) as 0, objects: rotateObjectsWithPage(p.objects, s.w, s.h, dir) }; }) })); },
    remove: () => { const ids = new Set(R.current.selPages.length ? R.current.selPages : curPage ? [curPage.id] : []); if (ids.size >= doc!.pages.length) { say("A PDF needs at least one page."); return; } H.commit((d) => ({ ...d, pages: d.pages.filter((p) => !ids.has(p.id)) })); setSelPages([]); clearSel(); },
    duplicate: () => { const ids = new Set(R.current.selPages.length ? R.current.selPages : curPage ? [curPage.id] : []); H.commit((d) => ({ ...d, pages: d.pages.flatMap((p) => (ids.has(p.id) ? [p, { ...p, id: uid(), objects: p.objects.map((o) => cloneObj(o)) }] : [p])) })); },
    blank: () => { const ref = curPage, w = ref ? ref.view[2] - ref.view[0] : 595.28, h = ref ? ref.view[3] - ref.view[1] : 841.89, at = (curIdx ?? 0) + 1; H.commit((d) => ({ ...d, pages: [...d.pages.slice(0, at), { id: uid(), src: null, view: [0, 0, w, h] as [number, number, number, number], nativeRot: 0, extra: 0 as const, crop: null, objects: [] }, ...d.pages.slice(at)] })); },
    reorder: (ids: string[], to: number) => H.commit((d) => { const moving = d.pages.filter((p) => ids.includes(p.id)), rest = d.pages.filter((p) => !ids.includes(p.id)), before = d.pages.slice(0, to).filter((p) => !ids.includes(p.id)).length; return { ...d, pages: [...rest.slice(0, before), ...moving, ...rest.slice(before)] }; }),
    crop: (c: Crop | null, scope: "selected" | "all") => { const ids = new Set(scope === "all" ? doc!.pages.map((p) => p.id) : R.current.selPages); H.commit((d) => ({ ...d, pages: d.pages.map((p) => (ids.has(p.id) ? { ...p, crop: c && (c.t || c.r || c.b || c.l) ? c : null } : p)) })); },
  };
  const onPickPage = (id: string, e: React.MouseEvent, i: number) => {
    if (e.shiftKey && selPages.length) { const last = doc!.pages.findIndex((p) => p.id === selPages[selPages.length - 1]), [a, b] = [Math.min(last, i), Math.max(last, i)]; setSelPages(doc!.pages.slice(a, b + 1).map((p) => p.id)); }
    else if (e.ctrlKey || e.metaKey) setSelPages((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    else setSelPages([id]);
    jump(i);
  };
  const jump = (i: number) => { setCurIdx(i); const p = R.current.doc?.pages[i]; if (p) document.querySelector(`[data-page-id="${p.id}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" }); };

  /* ---------- find & replace ---------- */
  const doFind = async (q: string, cs: boolean, ww: boolean): Promise<Hit[]> => {
    const out: Hit[] = [], f = R.current.fb!;
    for (const [pi, pg] of R.current.doc!.pages.entries()) for (const line of await sources.lines(pg)) for (const m of matchRects(line, q, cs, ww, f)) { out.push({ pageId: pg.id, pageIndex: pi, rect: m.rect, line, start: m.start, end: m.end, snippet: line.text.length > 60 ? "…" + line.text.slice(Math.max(0, m.start - 20), m.end + 30) + "…" : line.text }); if (out.length >= 500) return out; }
    return out;
  };
  const doReplace = (list: Hit[], text: string) => {
    const f = R.current.fb!, byPage = new Map<string, Obj[]>();
    for (const h of list) {
      const pg = pageById(h.pageId)!, cv = canvases.current.get(pg.id), s = pageSize(pg), { bg, fg } = sampleColors(cv, cv ? cv.width / s.w : 1, h.rect), l = h.line;
      const cover: Obj = { id: uid(), type: "cover", x: h.rect.x - 1.2, y: l.baseline - l.size * 0.85, w: h.rect.w + 2.4, h: l.size * 1.1, rot: 0, opacity: 1, color: bg };
      const t = newText({ x: h.rect.x, y: l.baseline - l.size * 0.8 }, { font: l.font, size: round(l.size, 1), color: fg, bold: l.bold, italic: l.italic, underline: false, strike: false, align: "left", lineHeight: 1, bg: null }, text, f, { coverId: cover.id });
      byPage.set(h.pageId, [...(byPage.get(h.pageId) ?? []), cover, ...(text ? [t] : [])]);
    }
    H.commit((d) => ({ ...d, pages: d.pages.map((p) => (byPage.has(p.id) ? { ...p, objects: [...p.objects, ...byPage.get(p.id)!] } : p)) }));
    setHits([]); say(`Replaced ${list.length} occurrence${list.length === 1 ? "" : "s"}. Check the result — spacing may differ slightly.`);
  };
  useEffect(() => { const h = hits[activeHit]; if (h) { document.querySelector(`[data-page-id="${h.pageId}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }); } }, [activeHit, hits]);
  const hitsByPage = useMemo(() => { const m = new Map<string, { rect: Rect; active: boolean }[]>(); hits.forEach((h, i) => m.set(h.pageId, [...(m.get(h.pageId) ?? []), { rect: h.rect, active: i === activeHit }])); return m; }, [hits, activeHit]);

  /* ---------- fonts, images ---------- */
  const loadFont = () => { fontTarget.current = R.current.sel.ids.length ? "selection" : "style"; files.font.current?.click(); };
  const onFontFile = async (f: File | undefined) => {
    if (!f || !R.current.fb) return;
    try {
      const cf = await R.current.fb.addCustom(f.name, new Uint8Array(await f.arrayBuffer())); bump();
      if (fontTarget.current === "selection") patch((o) => (o.type === "text" ? fitText({ ...o, font: cf.key, bold: false, italic: false }, R.current.fb!) : o)); else setStyles((s) => ({ ...s, text: { ...s.text, font: cf.key, bold: false, italic: false } }));
      say(`Font “${cf.name}” added.`);
    } catch { say("That file isn’t a usable TrueType/OpenType font."); }
  };
  const onImageFile = async (f: File | undefined) => { if (!f) { setToolState("select"); return; } try { const im = await readImage(f), a = addAsset(im.bytes, im.mime, im.w, im.h); setPlacing({ imgId: a.id, kind: "image" }); setToolState("image"); say("Click on the page where the image should go."); } catch { say("Couldn’t read that image."); setToolState("select"); } };
  const onWmImage = async (f: File | undefined) => { if (!f) return; try { const im = await readImage(f), a = addAsset(im.bytes, im.mime, im.w, im.h); H.commit((d) => ({ ...d, watermark: { ...d.watermark, kind: "image", imgId: a.id, enabled: true } })); } catch { say("Couldn’t read that image."); } };

  /* ---------- export ---------- */
  const runExport = async (o: { name: string; scope: "all" | "current" | "selected"; permanentRedaction: boolean; optimize: boolean }) => {
    const d = R.current.doc!, only = o.scope === "current" ? [d.pages[R.current.curIdx].id] : o.scope === "selected" ? d.pages.filter((p) => R.current.selPages.includes(p.id)).map((p) => p.id) : undefined;
    setExp((e) => ({ ...e, busy: "Starting…", error: "", result: null }));
    try {
      const r = await exportPdf({ doc: d, sources: sources.list.map((s) => ({ name: s.name, bytes: s.bytes })), assets, fonts: R.current.fb!, formValues, progress: (m) => setExp((e) => ({ ...e, busy: m })), options: { flattenForms: flatten, permanentRedaction: o.permanentRedaction, useObjectStreams: o.optimize, onlyPages: only } });
      const name = `${o.name.replace(/[^\w\- .()]+/g, "_")}.pdf`, url = URL.createObjectURL(new Blob([r.bytes as BlobPart], { type: "application/pdf" }));
      setExp({ busy: "", error: "", result: { name, size: r.bytes.length, warnings: r.warnings, url } });
      const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    } catch (e) { setExp({ busy: "", error: (e as Error).message || "Saving failed", result: null }); }
  };

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement, typing = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable, mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (!R.current.doc) return;
      if (mod && k === "s") { e.preventDefault(); setDialog("export"); return; }
      if (mod && k === "f") { e.preventDefault(); setTab("find"); setPanel("left"); return; }
      if (typing) return;
      if (mod && k === "z") { e.preventDefault(); e.shiftKey ? H.redo() : H.undo(); return; }
      if (mod && k === "y") { e.preventDefault(); H.redo(); return; }
      const s = R.current.sel, pg = s.pageId ? pageById(s.pageId) : undefined;
      if (mod && k === "c") { if (pg && s.ids.length) { clip.current = pg.objects.filter((o) => s.ids.includes(o.id)); e.preventDefault(); } return; }
      if (mod && k === "x") { if (pg && s.ids.length) { clip.current = pg.objects.filter((o) => s.ids.includes(o.id)); action("delete"); e.preventDefault(); } return; }
      if (mod && k === "v") { if (clip.current.length) { e.preventDefault(); const target = pg ?? R.current.doc!.pages[R.current.curIdx], copies = clip.current.map((o) => cloneObj(o, 14, 14)); H.commit(setObjects(target.id, (l) => [...l, ...copies])); select(target.id, copies.map((c) => c.id)); clip.current = clip.current.map((o) => translate(o, 14, 14)); } return; }
      if (mod && k === "d") { e.preventDefault(); action("duplicate"); return; }
      if (mod) return;
      if (e.key === "Delete" || e.key === "Backspace") { if (s.ids.length) { e.preventDefault(); action("delete"); } return; }
      if (e.key.startsWith("Arrow") && s.ids.length) {
        e.preventDefault(); const st = e.shiftKey ? 10 : 1, [dx, dy] = e.key === "ArrowLeft" ? [-st, 0] : e.key === "ArrowRight" ? [st, 0] : e.key === "ArrowUp" ? [0, -st] : [0, st];
        action(`move:${dx}:${dy}`); if (nudge.current) clearTimeout(nudge.current); nudge.current = setTimeout(() => H.endLive(), 500); return;
      }
      if (e.key === "Escape") { if (R.current.tool !== "select") setToolState("select"); else clearSel(); setPlacing(null); return; }
      if (e.key === "?") { setDialog("help"); return; }
      if (e.key === "+" || e.key === "=") { setZoom((z) => clamp(round(z * 1.15, 3), 0.2, 4)); return; }
      if (e.key === "-") { setZoom((z) => clamp(round(z / 1.15, 3), 0.2, 4)); return; }
      if (e.key === "0") { fitWidth(); return; }
      const t = TOOLS.find((x) => x.key.toLowerCase() === k); if (t) setTool(t.id);
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setTool]);
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [dirty]);
  useEffect(() => { // ctrl+wheel zoom
    const el = scrollRef.current; if (!el) return;
    const w = (e: WheelEvent) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom((z) => clamp(round(z * (e.deltaY < 0 ? 1.08 : 1 / 1.08), 3), 0.2, 4)); } };
    el.addEventListener("wheel", w, { passive: false }); return () => el.removeEventListener("wheel", w);
  }, [doc !== null]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { // track which page is in view
    const el = scrollRef.current; if (!el || !doc) return; let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const mid = el.getBoundingClientRect().top + el.clientHeight / 3; let best = 0, bd = Infinity; R.current.doc?.pages.forEach((p, i) => { const n = document.querySelector(`[data-page-id="${p.id}"]`); if (!n) return; const r = n.getBoundingClientRect(), d = mid < r.top ? r.top - mid : mid > r.bottom ? mid - r.bottom : 0; if (d < bd) { bd = d; best = i; } }); setCurIdx(best); }); };
    el.addEventListener("scroll", onScroll, { passive: true }); return () => el.removeEventListener("scroll", onScroll);
  }, [doc !== null]); // eslint-disable-line react-hooks/exhaustive-deps
  const fitWidth = () => { const el = scrollRef.current, d = R.current.doc; if (!el || !d) return; setZoom(clamp((el.clientWidth - 72) / Math.max(...d.pages.map((p) => pageSize(p).w)), 0.2, 4)); };
  const fitPage = () => { const el = scrollRef.current, p = R.current.doc?.pages[R.current.curIdx]; if (!el || !p) return; const s = pageSize(p); setZoom(clamp(Math.min((el.clientWidth - 72) / s.w, (el.clientHeight - 56) / s.h), 0.2, 4)); };

  // Stable handler bag so memoised pages don't re-render on every keystroke.
  const H2 = useRef({ onPageDown, onPageMove, onObjDown, onObjDouble, onHandleDown }); H2.current = { onPageDown, onPageMove, onObjDown, onObjDouble, onHandleDown };
  const stable = useMemo(() => ({
    onPageDown: (e: React.PointerEvent, p: PageState) => H2.current.onPageDown(e, p), onPageMove: (e: React.PointerEvent, p: PageState) => H2.current.onPageMove(e, p),
    onObjDown: (e: React.PointerEvent, p: PageState, o: Obj) => H2.current.onObjDown(e, p, o), onObjDouble: (p: PageState, o: Obj) => H2.current.onObjDouble(p, o),
    onHandleDown: (e: React.PointerEvent, p: PageState, o: Obj, h: string) => H2.current.onHandleDown(e, p, o, h),
    registerCanvas: (id: string, el: HTMLCanvasElement | null) => { if (el) canvases.current.set(id, el); else canvases.current.delete(id); },
  }), []);

  const hasRedact = !!doc?.pages.some((p) => p.objects.some((o) => o.type === "redact"));
  const editObj = editing ? (pageById(editing.pageId)?.objects.find((o) => o.id === editing.id) as TextObj | undefined) : undefined;
  const onEditChange = (val: string) => { if (!editing) return; H.live(setObjects(editing.pageId, (l) => l.map((o) => (o.id === editing.id && o.type === "text" ? fitText({ ...o, text: val }, R.current.fb!) : o)))); };

  /* ---------- render ---------- */
  if (!doc || !fb) {
    return (
      <div className="space-y-4">
        <input ref={files.open} type="file" accept=".pdf,application/pdf" hidden onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center transition hover:border-indigo-400 hover:bg-indigo-50" onClick={() => files.open.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); openFile(e.dataTransfer.files[0]); }}>
          <FileUp size={36} className="text-indigo-600" />
          <p className="text-lg font-semibold">{loading || (fb ? "Drop a PDF here, or click to open" : "Loading editor…")}</p>
          <p className="text-sm text-slate-500">Everything happens in your browser — your PDF is not uploaded.</p>
        </div>
        <div className="text-center"><button className="btn-ghost" onClick={startBlank} disabled={!fb}>…or start with a blank page</button></div>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      </div>
    );
  }

  const leftTabs: [Tab, string][] = [["pages", "Pages"], ["layers", "Layers"], ["find", "Find"], ["forms", "Forms"], ["doc", "Doc"]];
  const aside = (side: "left" | "right") => `${panel === side ? "fixed inset-y-0 z-50 flex w-[19rem] shadow-2xl" : "hidden lg:flex"} ${side === "left" ? "left-0 lg:w-64 lg:border-r" : "right-0 lg:w-72 lg:border-l"} shrink-0 flex-col overflow-hidden border-slate-200 bg-white`;
  return (
    <div className="-mx-4 flex h-[calc(100vh-7.5rem)] min-h-[640px] select-none flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:mx-0" onContextMenu={(e) => { if ((e.target as HTMLElement).closest("[data-page-id]")) e.preventDefault(); }}>
      <input ref={files.open} type="file" accept=".pdf,application/pdf" hidden onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={files.pdf} type="file" accept=".pdf,application/pdf" hidden onChange={(e) => { insertPdf(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={files.img} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { onImageFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={files.wm} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { onWmImage(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={files.font} type="file" accept=".ttf,.otf,font/ttf,font/otf" hidden onChange={(e) => { onFontFile(e.target.files?.[0]); e.target.value = ""; }} />

      {/* top bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-sm">
        <button className="btn-ghost !px-2 lg:hidden" aria-label="Pages and tools" onClick={() => setPanel(panel === "left" ? null : "left")}><PanelLeft size={15} /></button>
        <button className="btn-ghost" onClick={() => files.open.current?.click()}><FileUp size={14} /> Open</button>
        <span className="hidden max-w-[12rem] truncate font-medium text-slate-700 sm:block" title={fileName}>{fileName}.pdf{dirty && <span className="ml-1 text-amber-600" title="Unsaved changes">●</span>}</span>
        <span className="mx-1 h-5 w-px bg-slate-300" />
        <button className="btn-ghost !px-2" title="Undo (Ctrl+Z)" aria-label="Undo" disabled={!H.canUndo} onClick={H.undo}><Undo2 size={15} /></button>
        <button className="btn-ghost !px-2" title="Redo (Ctrl+Y)" aria-label="Redo" disabled={!H.canRedo} onClick={H.redo}><Redo2 size={15} /></button>
        <span className="mx-1 h-5 w-px bg-slate-300" />
        <button className="btn-ghost !px-2" aria-label="Zoom out" onClick={() => setZoom((z) => clamp(round(z / 1.15, 3), 0.2, 4))}><Minus size={14} /></button>
        <button className="btn-ghost min-w-[3.6rem] !px-2 tabular-nums" title="Fit width (0)" onClick={fitWidth}>{Math.round(zoom * 100)}%</button>
        <button className="btn-ghost !px-2" aria-label="Zoom in" onClick={() => setZoom((z) => clamp(round(z * 1.15, 3), 0.2, 4))}><Plus size={14} /></button>
        <button className="btn-ghost hidden !px-2 sm:inline-flex" title="Fit page" aria-label="Fit page" onClick={fitPage}><ZoomIn size={14} /></button>
        <label className="ml-1 flex items-center gap-1 text-xs text-slate-500">Page <input aria-label="Go to page" className="input !w-12 !px-1 !py-0.5 text-center text-xs" value={curIdx + 1} onChange={(e) => { const n = parseInt(e.target.value); if (n >= 1 && n <= doc.pages.length) jump(n - 1); }} /> / {doc.pages.length}</label>
        <span className="flex-1" />
        <button className="btn-ghost !px-2" title="Find & replace (Ctrl+F)" aria-label="Find and replace" onClick={() => { setTab("find"); setPanel("left"); }}><Search size={15} /></button>
        <button className="btn-ghost !px-2" title="Layers" aria-label="Layers" onClick={() => { setTab("layers"); setPanel("left"); }}><Layers size={15} /></button>
        <button className="btn-ghost !px-2" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts" onClick={() => setDialog("help")}><HelpCircle size={15} /></button>
        <button className="btn-ghost !px-2 lg:hidden" aria-label="Properties" onClick={() => setPanel(panel === "right" ? null : "right")}><PanelRight size={15} /></button>
        <button className="btn" onClick={() => { setExp({ busy: "", error: "", result: null }); setDialog("export"); }}><Download size={14} /> Save PDF</button>
      </div>
      <Toolbar tool={tool} setTool={setTool} />

      <div className="relative flex min-h-0 flex-1">
        {panel && <button aria-label="Close panel" className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={() => setPanel(null)} />}
        <aside className={aside("left")} aria-label="Pages and panels">
          <div className="flex shrink-0 overflow-x-auto border-b border-slate-200 text-xs">{leftTabs.map(([k, l]) => <button key={k} className={`flex-1 whitespace-nowrap px-2 py-2 font-medium ${tab === k ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-500 hover:text-slate-800"}`} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === "pages" && <PagesPanel doc={doc} sources={sources} selected={selPages} current={curIdx} onPick={onPickPage} onReorder={pageOps.reorder} onRotate={pageOps.rotate} onDelete={pageOps.remove} onDuplicate={pageOps.duplicate} onBlank={pageOps.blank} onInsertPdf={() => files.pdf.current?.click()} onSelectAll={() => setSelPages(doc.pages.map((p) => p.id))}
              onExtract={() => { if (!selPages.length) { say("Select pages first (Ctrl/Shift-click)."); return; } setExp({ busy: "", error: "", result: null }); setDialog("export"); }} />}
            {tab === "layers" && <LayersPanel page={curPage} selected={sel.pageId === curPage?.id ? sel.ids : []} onSelect={(id, add) => curPage && select(curPage.id, add && sel.pageId === curPage.id ? [...new Set([...sel.ids, id])] : [id])} onLock={(id) => { if (!curPage) return; H.commit(setObjects(curPage.id, (l) => l.map((o) => (o.id === id ? { ...o, locked: !o.locked } : o)))); }} onDelete={(id) => { if (!curPage) return; H.commit(setObjects(curPage.id, (l) => l.filter((o) => o.id !== id))); clearSel(); }} onMove={(id, dir) => { if (!curPage) return; select(curPage.id, [id]); reorder(dir === 1 ? "forward" : "backward"); }} />}
            {tab === "find" && <FindPanel onFind={doFind} hits={hits} setHits={setHits} active={activeHit} setActive={setActiveHit} onReplace={doReplace} busy={findBusy} setBusy={setFindBusy} />}
            {tab === "forms" && <FormsPanel fields={formFields} values={formValues} onChange={(n, v) => setFormValues((s) => ({ ...s, [n]: v }))} flatten={flatten} setFlatten={setFlatten} />}
            {tab === "doc" && <DocumentPanel meta={doc.meta} setMeta={(m) => H.commit((d) => ({ ...d, meta: m }))} wm={doc.watermark} setWm={(w, live) => (live ? H.live : H.commit)((d) => ({ ...d, watermark: w }))} hf={doc.hf} setHf={(h, live) => (live ? H.live : H.commit)((d) => ({ ...d, hf: h }))} fb={fb} assets={assets} pickWatermarkImage={() => files.wm.current?.click()} pageCount={doc.pages.length} selectedCount={selPages.length} onCrop={pageOps.crop} onPreviewCrop={setCropPrev} endLive={H.endLive} />}
          </div>
        </aside>

        <div ref={scrollRef} className="relative min-w-0 flex-1 overflow-auto bg-slate-200/70" style={{ scrollBehavior: "auto" }}>
          <div className="mx-auto flex w-max min-w-full flex-col items-center gap-6 px-6 py-6">
            {doc.pages.map((pg, i) => {
              const own = sel.pageId === pg.id;
              return (
                <div key={pg.id} className="flex flex-col items-center gap-1">
                  <span className="text-[11px] font-medium text-slate-500">Page {i + 1}{pg.extra ? ` · rotated ${pg.extra}°` : ""}{pg.crop ? " · cropped" : ""}</span>
                  <PageView page={pg} index={i} zoom={zoom} sources={sources} fb={fb} assets={assets} tool={tool} selected={own ? selObjs : EMPTY} editingId={editing?.pageId === pg.id ? editing.id : null} current={curIdx === i}
                    hoverRect={hover?.pageId === pg.id ? hover.rect : null} hits={hitsByPage.get(pg.id) ?? EMPTY} marquee={marquee?.pageId === pg.id ? marquee.rect : null} guides={guides?.pageId === pg.id ? guides.g : EMPTY}
                    cropPreview={cropPrev && (selPages.includes(pg.id) || (!selPages.length && curIdx === i)) ? cropPrev : null} {...stable}
                    overlay={editing?.pageId === pg.id && editObj ? <EditorBox obj={editObj} zoom={zoom} fb={fb} onChange={onEditChange} onDone={finishEditing} /> : undefined} />
                </div>
              );
            })}
          </div>
          {toast && <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg" role="status">{toast}</div>}
        </div>

        <aside className={aside("right")} aria-label="Properties">
          <div className="border-b border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">Properties</div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Inspector selected={selObjs} tool={tool} styles={styles} setStyles={setStyles} fb={fb} pageCount={doc.pages.length} patch={patch} fit={fit as never} action={action} endLive={H.endLive} loadFont={loadFont} />
          </div>
        </aside>
      </div>

      {dialog === "sig" && <SignatureDialog onClose={() => { setDialog(null); if (!placing) setToolState("select"); }} onDone={onSignature} />}
      {dialog === "help" && <HelpDialog onClose={() => setDialog(null)} />}
      {dialog === "export" && <ExportDialog onClose={() => setDialog(null)} baseName={fileName} totalPages={doc.pages.length} selectedCount={selPages.length} hasRedact={hasRedact} hasForm={formFields.length > 0 || doc.pages.some((p) => p.objects.some((o) => o.type === "field"))} flatten={flatten} setFlatten={setFlatten} run={runExport} busy={exp.busy} result={exp.result} error={exp.error} />}
      {error && <p className="absolute bottom-2 left-2 rounded bg-red-50 p-2 text-xs text-red-700" role="alert">{error}</p>}
    </div>
  );
}

function EditorBox({ obj, zoom, fb, onChange, onDone }: { obj: TextObj; zoom: number; fb: FontBook; onChange: (v: string) => void; onDone: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // Focus after the click that created this box has fully finished, otherwise the browser's own mousedown focus handling blurs it immediately.
  useEffect(() => { const id = window.setTimeout(() => { const t = ref.current; if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, 60); return () => clearTimeout(id); }, []);
  return (
    <textarea ref={ref} value={obj.text} aria-label="Edit text" spellCheck={false} onChange={(e) => onChange(e.target.value)} onBlur={onDone}
      onKeyDown={(e) => { if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) { e.preventDefault(); (e.target as HTMLElement).blur(); } e.stopPropagation(); }}
      onPointerDown={(e) => e.stopPropagation()}
      style={{ position: "absolute", left: obj.x * zoom, top: obj.y * zoom, width: (obj.wrap ? obj.w : obj.w + obj.size * 2) * zoom, height: Math.max(obj.h, obj.size * obj.lineHeight) * zoom + 2, transform: obj.rot ? `rotate(${obj.rot}deg)` : undefined, transformOrigin: `${(obj.w / 2) * zoom}px ${(obj.h / 2) * zoom}px`, fontFamily: fb.css(obj.font), fontSize: obj.size * zoom, fontWeight: obj.bold ? 700 : 400, fontStyle: obj.italic ? "italic" : "normal", lineHeight: obj.lineHeight, color: obj.color, textAlign: obj.align, background: obj.bg ?? "rgba(255,255,255,.55)", border: "1px dashed #2563eb", padding: 0, margin: 0, resize: "none", overflow: "hidden", outline: "none", whiteSpace: obj.wrap ? "pre-wrap" : "pre", textDecoration: [obj.underline ? "underline" : "", obj.strike ? "line-through" : ""].filter(Boolean).join(" ") || undefined, zIndex: 5 }} />
  );
}
void parseRange; void defaultHF;
