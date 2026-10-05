"use client";
import { memo } from "react";
import { arrowHeadSize, inkPathD } from "./export";
import { FontBook, layoutText } from "./fonts";
import { center } from "./geometry";
import type { ImageAsset, Obj, Pt } from "./types";

const dashArr = (d: string, w: number) => (d === "dashed" ? `${w * 4} ${w * 2.5}` : d === "dotted" ? `${w * 0.1} ${w * 2.2}` : undefined);

export function arrowPoints(tip: Pt, from: Pt, size: number): string {
  const a = Math.atan2(tip.y - from.y, tip.x - from.x), s = Math.PI / 7;
  return `${tip.x},${tip.y} ${tip.x - size * Math.cos(a - s)},${tip.y - size * Math.sin(a - s)} ${tip.x - size * Math.cos(a + s)},${tip.y - size * Math.sin(a + s)}`;
}

interface Props { o: Obj; fb: FontBook; assets: Map<string, ImageAsset>; hideText?: boolean; scale: number }

/** Draws one object in page-point coordinates. Must look the same as the exported PDF. */
function ObjectViewImpl({ o, fb, assets, hideText, scale }: Props) {
  const c = center(o), rot = o.rot ? `rotate(${o.rot} ${c.x} ${c.y})` : undefined, hit = { fill: "transparent", pointerEvents: "all" as const };
  const common = { "data-oid": o.id, opacity: o.opacity, style: { cursor: o.locked ? "not-allowed" : "move" } };
  switch (o.type) {
    case "text": {
      const L = layoutText(o, fb), deco = [o.underline ? "underline" : "", o.strike ? "line-through" : ""].filter(Boolean).join(" ");
      return (
        <g {...common} transform={rot}>
          {o.bg && <rect x={o.x} y={o.y} width={o.w} height={o.h} fill={o.bg} />}
          <rect x={o.x} y={o.y} width={Math.max(o.w, 4)} height={Math.max(o.h, o.size)} {...hit} />
          {!hideText && L.lines.map((l, i) => l.text && (
            <text key={i} x={o.x + l.x} y={o.y + l.baseline} fill={o.color} fontSize={o.size} fontFamily={fb.css(o.font)} fontWeight={o.bold ? 700 : 400} fontStyle={o.italic ? "italic" : "normal"} textDecoration={deco || undefined} style={{ whiteSpace: "pre", userSelect: "none" }} direction="ltr" unicodeBidi="plaintext">{l.text}</text>
          ))}
        </g>
      );
    }
    case "rect": case "ellipse": {
      const dash = o.stroke ? dashArr(o.dash, o.strokeW) : undefined, sw = o.stroke ? o.strokeW : 0, p = { fill: o.fill ?? "none", stroke: o.stroke ?? "none", strokeWidth: sw, strokeDasharray: dash, strokeLinecap: o.dash === "dotted" ? ("round" as const) : undefined };
      return (
        <g {...common} transform={rot}>
          {o.type === "rect" ? <rect x={o.x} y={o.y} width={o.w} height={o.h} rx={Math.min(o.radius, o.w / 2, o.h / 2)} {...p} /> : <ellipse cx={c.x} cy={c.y} rx={o.w / 2} ry={o.h / 2} {...p} />}
          {!o.fill && <rect x={o.x} y={o.y} width={o.w} height={o.h} fill="transparent" stroke="transparent" strokeWidth={Math.max(8 / scale, o.strokeW)} pointerEvents="stroke" />}
          {o.fill && <rect x={o.x} y={o.y} width={o.w} height={o.h} {...hit} />}
        </g>
      );
    }
    case "line": case "arrow": {
      const [a, b] = o.pts, hs = arrowHeadSize(o.strokeW), L = Math.hypot(b.x - a.x, b.y - a.y) || 1, t = Math.min(hs * 0.7, L / 2);
      const s0 = o.type === "arrow" && o.head === "both" ? { x: a.x + ((b.x - a.x) / L) * t, y: a.y + ((b.y - a.y) / L) * t } : a;
      const s1 = o.type === "arrow" && o.head !== "none" ? { x: b.x - ((b.x - a.x) / L) * t, y: b.y - ((b.y - a.y) / L) * t } : b;
      return (
        <g {...common}>
          <line x1={s0.x} y1={s0.y} x2={s1.x} y2={s1.y} stroke={o.stroke} strokeWidth={o.strokeW} strokeDasharray={dashArr(o.dash, o.strokeW)} strokeLinecap="round" />
          {o.type === "arrow" && o.head !== "none" && <polygon points={arrowPoints(b, a, hs)} fill={o.stroke} />}
          {o.type === "arrow" && o.head === "both" && <polygon points={arrowPoints(a, b, hs)} fill={o.stroke} />}
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={Math.max(10 / scale, o.strokeW)} pointerEvents="stroke" />
        </g>
      );
    }
    case "ink":
      return (
        <g {...common}>
          {o.strokes.map((s, i) => <path key={i} d={inkPathD(s)} fill="none" stroke={o.color} strokeWidth={o.strokeW} strokeLinecap="round" strokeLinejoin="round" />)}
          {o.strokes.map((s, i) => <path key={"h" + i} d={inkPathD(s)} fill="none" stroke="transparent" strokeWidth={Math.max(10 / scale, o.strokeW)} pointerEvents="stroke" />)}
        </g>
      );
    case "highlight": case "underline": case "strike":
      return (
        <g {...common}>
          {o.rects.map((r, i) => o.type === "highlight"
            ? <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={o.color} style={{ mixBlendMode: "multiply" }} />
            : <line key={i} x1={r.x} x2={r.x + r.w} y1={o.type === "underline" ? r.y + r.h * 0.92 : r.y + r.h * 0.55} y2={o.type === "underline" ? r.y + r.h * 0.92 : r.y + r.h * 0.55} stroke={o.color} strokeWidth={Math.max(0.8, r.h * 0.07)} />)}
          {o.rects.map((r, i) => <rect key={"h" + i} x={r.x} y={r.y} width={r.w} height={r.h} {...hit} />)}
        </g>
      );
    case "image": {
      const a = assets.get(o.imgId);
      return <g {...common} transform={rot}>{a ? <image href={a.url} x={o.x} y={o.y} width={o.w} height={o.h} preserveAspectRatio="none" /> : <rect x={o.x} y={o.y} width={o.w} height={o.h} fill="#ddd" />}<rect x={o.x} y={o.y} width={o.w} height={o.h} {...hit} /></g>;
    }
    case "cover": case "redact":
      return <g {...common} transform={rot}><rect x={o.x} y={o.y} width={o.w} height={o.h} fill={o.type === "redact" ? "#000" : o.color} />{o.type === "redact" && <text x={o.x + 3} y={o.y + Math.min(o.h - 3, 10)} fontSize={Math.min(8, o.h * 0.5)} fill="#ef4444" style={{ userSelect: "none" }}>REDACT</text>}</g>;
    case "stamp": {
      const tw = fb.width("helvetica", true, false, o.label, o.size), pad = o.size * 0.35, w = tw + pad * 2, h = o.size * 1.25 + pad, cx = o.x + w / 2, cy = o.y + h / 2;
      return (
        <g {...common} transform={o.rot ? `rotate(${o.rot} ${cx} ${cy})` : undefined}>
          <rect x={o.x} y={o.y} width={w} height={h} rx={o.size * 0.15} fill="none" stroke={o.color} strokeWidth={Math.max(1.5, o.size * 0.09)} />
          <text x={o.x + pad} y={o.y + h / 2 + o.size * 0.34} fontSize={o.size} fontWeight={700} fill={o.color} fontFamily={fb.css("helvetica")} style={{ userSelect: "none" }}>{o.label}</text>
          <rect x={o.x} y={o.y} width={w} height={h} {...hit} />
        </g>
      );
    }
    case "note":
      return <g {...common}><rect x={o.x} y={o.y} width={o.w} height={o.h} rx={4} fill={o.color} stroke="#a16207" strokeWidth={1} /><path d={`M${o.x + 5} ${o.y + 7}h${o.w - 10}M${o.x + 5} ${o.y + 11}h${o.w - 10}M${o.x + 5} ${o.y + 15}h${(o.w - 10) * 0.6}`} stroke="#713f12" strokeWidth={1.2} /></g>;
    case "link":
      return <g {...common}><rect x={o.x} y={o.y} width={o.w} height={o.h} fill="rgba(59,130,246,.12)" stroke="#2563eb" strokeWidth={o.border ? 1 : 0.6} strokeDasharray={o.border ? undefined : "3 2"} /><text x={o.x + 3} y={o.y + Math.min(o.h - 2, 10)} fontSize={Math.min(8, o.h * 0.7)} fill="#1d4ed8" style={{ userSelect: "none" }}>{o.kind === "url" ? "↗ link" : `↗ p.${o.page}`}</text></g>;
    case "field":
      return (
        <g {...common}>
          <rect x={o.x} y={o.y} width={o.w} height={o.h} fill="rgba(219,234,254,.85)" stroke="#334155" strokeWidth={1} />
          {o.kind === "checkbox" ? (o.value === "true" && <path d={`M${o.x + o.w * 0.2} ${o.y + o.h * 0.55} l${o.w * 0.25} ${o.h * 0.25} l${o.w * 0.38} ${-o.h * 0.5}`} stroke="#111" strokeWidth={Math.max(1.2, o.w * 0.1)} fill="none" />)
            : <text x={o.x + 3} y={o.y + o.h / 2 + o.fontSize * 0.35} fontSize={o.fontSize} fill={o.value ? "#111" : "#64748b"} style={{ userSelect: "none" }} fontFamily={fb.css("helvetica")}>{o.value || o.name}</text>}
        </g>
      );
  }
}
export const ObjectView = memo(ObjectViewImpl);
