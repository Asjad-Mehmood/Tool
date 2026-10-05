"use client";
import { memo, useEffect, useRef, useState } from "react";
import { ObjectView } from "./ObjectView";
import type { FontBook } from "./fonts";
import { corners, rotateAround, center } from "./geometry";
import type { Sources } from "./runtime";
import { pageRot, pageSize, type Crop, type ImageAsset, type Obj, type PageState, type Rect, type ToolId } from "./types";

export const ROTATABLE = new Set(["text", "rect", "ellipse", "image", "cover", "redact", "stamp", "field", "link"]);
export const HANDLES: Record<string, [number, number]> = { nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0] };
const CURSORS: Record<string, string> = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };

export interface PageViewProps {
  page: PageState; index: number; zoom: number; sources: Sources; fb: FontBook; assets: Map<string, ImageAsset>;
  tool: ToolId; selected: Obj[]; editingId: string | null; current: boolean;
  hoverRect: Rect | null; hits: { rect: Rect; active: boolean }[]; marquee: Rect | null; guides: { x?: number; y?: number }[]; cropPreview: Crop | null;
  registerCanvas: (id: string, el: HTMLCanvasElement | null) => void;
  onPageDown: (e: React.PointerEvent, p: PageState) => void;
  onPageMove: (e: React.PointerEvent, p: PageState) => void;
  onObjDown: (e: React.PointerEvent, p: PageState, o: Obj) => void;
  onObjDouble: (p: PageState, o: Obj) => void;
  onHandleDown: (e: React.PointerEvent, p: PageState, o: Obj, handle: string) => void;
  overlay?: React.ReactNode;
}

function Selection({ objs, zoom, onHandle }: { objs: Obj[]; zoom: number; onHandle: (e: React.PointerEvent, o: Obj, h: string) => void }) {
  const px = 1 / zoom, hs = 9 * px, stroke = "#2563eb";
  const outline = (o: Obj) => <polygon key={o.id} points={corners(o).map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={stroke} strokeWidth={px * 1.2} strokeDasharray={`${4 * px} ${3 * px}`} pointerEvents="none" />;
  if (objs.length !== 1) return <>{objs.map(outline)}</>;
  const o = objs[0], c = center(o);
  if (o.type === "line" || o.type === "arrow") {
    return <>{o.pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={5.5 * px} fill="#fff" stroke={stroke} strokeWidth={px * 1.5} style={{ cursor: "crosshair" }} onPointerDown={(e) => { e.stopPropagation(); onHandle(e, o, `p${i}`); }} />)}</>;
  }
  if (o.type === "note") return outline(o);
  const handles = Object.entries(HANDLES).map(([k, [dx, dy]]) => {
    if (o.type === "text" && !o.wrap && (k === "n" || k === "s")) return null; // text height follows its content
    const p = rotateAround({ x: c.x + (dx * o.w) / 2, y: c.y + (dy * o.h) / 2 }, c, o.rot);
    return <rect key={k} x={p.x - hs / 2} y={p.y - hs / 2} width={hs} height={hs} rx={px * 1.5} fill="#fff" stroke={stroke} strokeWidth={px * 1.5} style={{ cursor: CURSORS[k] }} onPointerDown={(e) => { e.stopPropagation(); onHandle(e, o, k); }} />;
  });
  const top = rotateAround({ x: c.x, y: o.y }, c, o.rot), rp = rotateAround({ x: c.x, y: o.y - 24 * px }, c, o.rot);
  return (
    <>
      {outline(o)}
      {ROTATABLE.has(o.type) && !o.locked && <>
        <line x1={top.x} y1={top.y} x2={rp.x} y2={rp.y} stroke={stroke} strokeWidth={px} pointerEvents="none" />
        <circle cx={rp.x} cy={rp.y} r={5.5 * px} fill="#fff" stroke={stroke} strokeWidth={px * 1.5} style={{ cursor: "grab" }} onPointerDown={(e) => { e.stopPropagation(); onHandle(e, o, "rot"); }} />
      </>}
      {!o.locked && handles}
    </>
  );
}

function PageViewImpl(p: PageViewProps) {
  const { page, zoom, sources } = p, size = pageSize(page), rot = pageRot(page);
  const wrap = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false), [rendered, setRendered] = useState(false);
  const srcKey = page.src ? `${page.src.doc}:${page.src.index}` : "blank";

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "900px 0px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  useEffect(() => { p.registerCanvas(page.id, canvas.current); return () => p.registerCanvas(page.id, null); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page.id]);

  useEffect(() => {
    if (!visible) return;
    const cv = canvas.current; if (!cv) return;
    let dead = false, task: { cancel: () => void } | null = null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let scale = zoom * dpr; const maxPx = 22e6;
    if (size.w * scale * size.h * scale > maxPx) scale = Math.sqrt(maxPx / (size.w * size.h));
    const t = setTimeout(async () => {
      const W = Math.max(1, Math.floor(size.w * scale)), H = Math.max(1, Math.floor(size.h * scale));
      if (!page.src) { cv.width = W; cv.height = H; const g = cv.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); setRendered(true); return; }
      try {
        const pp = await sources.page(page.src.doc, page.src.index), vp = pp.getViewport({ scale, rotation: rot }), off = document.createElement("canvas");
        off.width = Math.floor(vp.width); off.height = Math.floor(vp.height);
        const r = pp.render({ canvasContext: off.getContext("2d")!, viewport: vp, canvas: off }); task = r;
        await r.promise;
        if (dead) return;
        cv.width = off.width; cv.height = off.height; cv.getContext("2d")!.drawImage(off, 0, 0); setRendered(true);
      } catch { /* cancelled or failed render */ }
    }, 70);
    return () => { dead = true; clearTimeout(t); task?.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, zoom, rot, srcKey, size.w, size.h]);

  const cursor = p.tool === "select" ? "default" : p.tool === "text" || p.tool === "edit" ? "text" : "crosshair";
  const px = 1 / zoom;
  return (
    <div ref={wrap} data-page-id={page.id} className={`relative shrink-0 bg-white shadow-lg ${p.current ? "ring-2 ring-indigo-400/60" : ""}`} style={{ width: size.w * zoom, height: size.h * zoom }}>
      <canvas ref={canvas} style={{ width: "100%", height: "100%", display: "block", opacity: rendered ? 1 : 0.4 }} />
      <svg className="absolute inset-0" width={size.w * zoom} height={size.h * zoom} viewBox={`0 0 ${size.w} ${size.h}`} style={{ cursor, touchAction: p.tool === "select" ? "pan-y pinch-zoom" : "none", overflow: "hidden" }}
        onPointerDown={(e) => p.onPageDown(e, page)} onPointerMove={(e) => p.onPageMove(e, page)}>
        {page.objects.map((o) => (
          <g key={o.id} onPointerDown={(e) => { if (p.tool === "select") { e.stopPropagation(); p.onObjDown(e, page, o); } }} onDoubleClick={() => p.onObjDouble(page, o)}>
            <ObjectView o={o} fb={p.fb} assets={p.assets} hideText={p.editingId === o.id} scale={zoom} />
          </g>
        ))}
        {p.hits.map((h, i) => <rect key={i} x={h.rect.x} y={h.rect.y} width={h.rect.w} height={h.rect.h} fill={h.active ? "rgba(249,115,22,.45)" : "rgba(250,204,21,.4)"} stroke={h.active ? "#ea580c" : "none"} pointerEvents="none" />)}
        {p.hoverRect && <rect x={p.hoverRect.x - 1} y={p.hoverRect.y - 1} width={p.hoverRect.w + 2} height={p.hoverRect.h + 2} fill="rgba(37,99,235,.08)" stroke="#2563eb" strokeWidth={px * 1.2} strokeDasharray={`${3 * px} ${2 * px}`} pointerEvents="none" />}
        {p.cropPreview && (() => { const c = p.cropPreview; const w = size.w, h = size.h; return <path d={`M0 0H${w}V${h}H0Z M${c.l} ${c.t}V${h - c.b}H${w - c.r}V${c.t}Z`} fillRule="evenodd" fill="rgba(15,23,42,.55)" pointerEvents="none" />; })()}
        {p.selected.length > 0 && p.tool === "select" && p.editingId === null && <Selection objs={p.selected} zoom={zoom} onHandle={(e, o, h) => p.onHandleDown(e, page, o, h)} />}
        {p.guides.map((g, i) => g.x !== undefined ? <line key={i} x1={g.x} x2={g.x} y1={0} y2={size.h} stroke="#d946ef" strokeWidth={px} pointerEvents="none" /> : <line key={i} y1={g.y} y2={g.y} x1={0} x2={size.w} stroke="#d946ef" strokeWidth={px} pointerEvents="none" />)}
        {p.marquee && <rect x={p.marquee.x} y={p.marquee.y} width={p.marquee.w} height={p.marquee.h} fill="rgba(37,99,235,.1)" stroke="#2563eb" strokeWidth={px} strokeDasharray={`${4 * px} ${3 * px}`} pointerEvents="none" />}
      </svg>
      {p.overlay}
    </div>
  );
}
export const PageView = memo(PageViewImpl);
