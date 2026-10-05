"use client";
import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical, ArrowDownToLine, ArrowUpToLine, ChevronDown, ChevronUp, Copy, Lock, Trash2, Unlock, Undo2 } from "lucide-react";
import { STAMPS, type Styles } from "./defaults";
import { STANDARD_FAMILIES, type FontBook } from "./fonts";
import { round } from "./geometry";
import type { Dash, Obj, ToolId } from "./types";

export type PatchFn = (o: Obj) => Obj;
export interface InspectorProps {
  selected: Obj[]; tool: ToolId; styles: Styles; setStyles: (fn: (s: Styles) => Styles) => void; fb: FontBook; pageCount: number;
  patch: (fn: PatchFn, live?: boolean) => void; fit: (t: Extract<Obj, { type: "text" }>) => Extract<Obj, { type: "text" }>; action: (a: string) => void; endLive: () => void; loadFont: () => void;
}

export const Label = ({ children }: { children: React.ReactNode }) => <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">{children}</span>;
export const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="space-y-2 border-b border-slate-200 px-3 py-3"><h3 className="text-xs font-bold text-slate-700">{title}</h3>{children}</section>;
export function Num({ label, value, onChange, step = 1, min, max, unit }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit?: string }) {
  return <label className="block"><Label>{label}</Label><span className="flex items-center gap-1"><input type="number" className="input !px-2 !py-1 text-xs" value={Number.isFinite(value) ? round(value, 2) : ""} step={step} min={min} max={max} onChange={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) onChange(max !== undefined ? Math.min(max, Math.max(min ?? -1e9, v)) : min !== undefined ? Math.max(min, v) : v); }} />{unit && <span className="text-[10px] text-slate-400">{unit}</span>}</span></label>;
}
export function Color({ label, value, onChange, nullable }: { label: string; value: string | null; onChange: (v: string | null, live: boolean) => void; nullable?: boolean }) {
  return (
    <div><Label>{label}</Label>
      <div className="flex items-center gap-1.5">
        <input type="color" className="h-7 w-9 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5 disabled:opacity-30" value={value ?? "#ffffff"} disabled={value === null} onChange={(e) => onChange(e.target.value, true)} aria-label={label} />
        <input className="input !px-2 !py-1 font-mono text-xs" value={value ?? ""} placeholder="none" disabled={value === null} onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && onChange(e.target.value, true)} />
        {nullable && <label className="flex items-center gap-1 text-[11px] text-slate-500"><input type="checkbox" checked={value === null} onChange={(e) => onChange(e.target.checked ? null : "#000000", false)} />none</label>}
      </div>
    </div>
  );
}
export function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; label: React.ReactNode; title?: string }[]; onChange: (v: T) => void }) {
  return <div><Label>{label}</Label><div className="flex overflow-hidden rounded-lg border border-slate-300">{options.map((o) => <button key={o.v} type="button" title={o.title} aria-pressed={value === o.v} className={`flex-1 px-2 py-1 text-xs ${value === o.v ? "bg-indigo-600 text-white" : "bg-white hover:bg-slate-100"}`} onClick={() => onChange(o.v)}>{o.label}</button>)}</div></div>;
}
export const Range = ({ label, value, min, max, step, onChange, fmt }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt?: (v: number) => string }) => (
  <label className="block"><Label>{label}: {fmt ? fmt(value) : value}</Label><input type="range" className="w-full" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} /></label>
);
export const IconBtn = ({ title, onClick, children, danger }: { title: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) => <button type="button" title={title} aria-label={title} onClick={onClick} className={`btn-ghost !px-2 !py-1.5 ${danger ? "!text-red-600" : ""}`}>{children}</button>;

const FontControls = ({ v, apply, canBg = true, fb, loadFont }: { fb: FontBook; loadFont: () => void; v: { font: string; size: number; color: string; bold: boolean; italic: boolean; underline: boolean; strike: boolean; align: "left" | "center" | "right"; lineHeight: number; bg: string | null }; apply: (part: Record<string, unknown>, live?: boolean) => void; canBg?: boolean }) => {
  const custom = [...fb.customs.values()], isCustom = v.font.startsWith("custom:");
  return (
    <>
      <label className="block"><Label>Font</Label>
        <select className="input !px-2 !py-1 text-xs" value={v.font} onChange={(e) => apply({ font: e.target.value })}>
          {STANDARD_FAMILIES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          {custom.length > 0 && <optgroup label="Your fonts">{custom.map((f) => <option key={f.key} value={f.key}>{f.name}</option>)}</optgroup>}
        </select>
      </label>
      <button type="button" className="text-xs text-indigo-600 underline" onClick={loadFont}>Add a font file (.ttf / .otf)…</button>
      <div className="grid grid-cols-2 gap-2"><Num label="Size" value={v.size} min={4} max={400} step={1} unit="pt" onChange={(n) => apply({ size: n }, true)} /><Num label="Line spacing" value={v.lineHeight} min={0.8} max={3} step={0.05} onChange={(n) => apply({ lineHeight: n }, true)} /></div>
      <div className="flex gap-1">
        {!isCustom && <button type="button" aria-pressed={v.bold} title="Bold" className={`btn-ghost flex-1 !px-0 font-bold ${v.bold ? "!bg-indigo-600 !text-white" : ""}`} onClick={() => apply({ bold: !v.bold })}>B</button>}
        {!isCustom && <button type="button" aria-pressed={v.italic} title="Italic" className={`btn-ghost flex-1 !px-0 italic ${v.italic ? "!bg-indigo-600 !text-white" : ""}`} onClick={() => apply({ italic: !v.italic })}>I</button>}
        <button type="button" aria-pressed={v.underline} title="Underline" className={`btn-ghost flex-1 !px-0 underline ${v.underline ? "!bg-indigo-600 !text-white" : ""}`} onClick={() => apply({ underline: !v.underline })}>U</button>
        <button type="button" aria-pressed={v.strike} title="Strikethrough" className={`btn-ghost flex-1 !px-0 line-through ${v.strike ? "!bg-indigo-600 !text-white" : ""}`} onClick={() => apply({ strike: !v.strike })}>S</button>
      </div>
      <Seg label="Align" value={v.align} onChange={(a) => apply({ align: a })} options={[{ v: "left", label: "Left" }, { v: "center", label: "Centre" }, { v: "right", label: "Right" }]} />
      <Color label="Text colour" value={v.color} onChange={(c, l) => apply({ color: c ?? "#000000" }, l)} />
      {canBg && <Color label="Background" value={v.bg} nullable onChange={(c, l) => apply({ bg: c }, l)} />}
    </>
  );
};
const ShapeControls = ({ v, apply }: { v: { stroke: string | null; strokeW: number; fill: string | null; dash: Dash; radius?: number }; apply: (part: Record<string, unknown>, live?: boolean) => void }) => (
  <>
    <Color label="Border" value={v.stroke} nullable onChange={(c, l) => apply({ stroke: c }, l)} />
    <Color label="Fill" value={v.fill} nullable onChange={(c, l) => apply({ fill: c }, l)} />
    <div className="grid grid-cols-2 gap-2"><Num label="Border width" value={v.strokeW} min={0} max={40} step={0.5} unit="pt" onChange={(n) => apply({ strokeW: n }, true)} />{v.radius !== undefined && <Num label="Corner radius" value={v.radius} min={0} max={200} unit="pt" onChange={(n) => apply({ radius: n }, true)} />}</div>
    <Seg label="Line style" value={v.dash} onChange={(d) => apply({ dash: d })} options={[{ v: "solid", label: "Solid" }, { v: "dashed", label: "Dashed" }, { v: "dotted", label: "Dotted" }]} />
  </>
);
const LineControls = ({ v, apply, arrow }: { v: { stroke: string; strokeW: number; dash: Dash; head: "none" | "end" | "both" }; apply: (part: Record<string, unknown>, live?: boolean) => void; arrow: boolean }) => (
  <>
    <Color label="Colour" value={v.stroke} onChange={(c, l) => apply({ stroke: c ?? "#000000" }, l)} />
    <Num label="Width" value={v.strokeW} min={0.5} max={40} step={0.5} unit="pt" onChange={(n) => apply({ strokeW: n }, true)} />
    <Seg label="Style" value={v.dash} onChange={(d) => apply({ dash: d })} options={[{ v: "solid", label: "Solid" }, { v: "dashed", label: "Dashed" }, { v: "dotted", label: "Dotted" }]} />
    {arrow && <Seg label="Arrow heads" value={v.head} onChange={(h) => apply({ head: h })} options={[{ v: "end", label: "End" }, { v: "both", label: "Both" }, { v: "none", label: "None" }]} />}
  </>
);


export default function Inspector(p: InspectorProps) {
  const { selected: sel, fb } = p, one = sel.length === 1 ? sel[0] : null, types = new Set(sel.map((o) => o.type));
  const only = <T extends Obj["type"]>(...t: T[]) => sel.length > 0 && sel.every((o) => (t as string[]).includes(o.type));
  const set = (f: (o: Obj) => Obj, live = false) => p.patch(f, live);
  // ---- nothing selected: show the defaults for the active tool
  if (!sel.length) {
    const { styles, setStyles, tool } = p;
    const upd = <K extends keyof Styles>(k: K) => (part: Record<string, unknown>) => setStyles((s) => ({ ...s, [k]: { ...s[k], ...part } }));
    return (
      <div className="text-sm">
        <Sec title={tool === "select" ? "Nothing selected" : "Tool settings"}>
          {tool === "select" && <p className="text-xs text-slate-500">Pick a tool above, then click or drag on the page. Click an object to edit it. Double-click text to change it. Press <kbd className="rounded border px-1">?</kbd> for shortcuts.</p>}
        </Sec>
        {(tool === "text" || tool === "edit") && <Sec title="Text style (new text)"><FontControls fb={fb} loadFont={p.loadFont} v={styles.text} apply={upd("text")} canBg={tool === "text"} /></Sec>}
        {(tool === "rect" || tool === "ellipse") && <Sec title="Shape style"><ShapeControls v={styles.shape} apply={upd("shape")} /></Sec>}
        {(tool === "line" || tool === "arrow") && <Sec title="Line style"><LineControls v={styles.line} arrow={tool === "arrow"} apply={upd("line")} /></Sec>}
        {tool === "pen" && <Sec title="Pen"><Color label="Colour" value={styles.pen.color} onChange={(c) => upd("pen")({ color: c ?? "#000" })} /><Num label="Thickness" value={styles.pen.width} min={0.5} max={30} step={0.5} unit="pt" onChange={(n) => upd("pen")({ width: n })} /></Sec>}
        {(tool === "highlight" || tool === "underline" || tool === "strike") && <Sec title="Markup"><Color label="Colour" value={styles.mark[tool]} onChange={(c) => upd("mark")({ [tool]: c ?? "#fde047" })} />{tool === "highlight" && <Range label="Strength" value={styles.mark.opacity} min={0.15} max={1} step={0.05} onChange={(n) => upd("mark")({ opacity: n })} fmt={(v) => `${Math.round(v * 100)}%`} />}<p className="text-[11px] text-slate-500">Drag across text to mark it.</p></Sec>}
        {tool === "cover" && <Sec title="White-out"><Color label="Colour" value={styles.cover.color} onChange={(c) => upd("cover")({ color: c ?? "#fff" })} /><p className="text-[11px] text-slate-500">Hides what is underneath (the original is still in the file). Use Redact to remove it for good.</p></Sec>}
        {tool === "redact" && <Sec title="Redact"><p className="text-xs text-slate-500">Draw black boxes over sensitive content. When you save, pages with redactions are flattened so the covered text can’t be recovered.</p></Sec>}
        {tool === "stamp" && <Sec title="Stamp">
          <div className="grid grid-cols-2 gap-1">{STAMPS.map((s) => <button key={s.label} className={`rounded border px-1 py-1 text-[11px] font-bold ${styles.stamp.label === s.label ? "ring-2 ring-indigo-500" : ""}`} style={{ color: s.color, borderColor: s.color }} onClick={() => upd("stamp")({ label: s.label, color: s.color })}>{s.label}</button>)}</div>
          <label className="block"><Label>Custom text</Label><input className="input !px-2 !py-1 text-xs" value={styles.stamp.label} onChange={(e) => upd("stamp")({ label: e.target.value.toUpperCase() })} /></label>
          <Num label="Size" value={styles.stamp.size} min={8} max={120} unit="pt" onChange={(n) => upd("stamp")({ size: n })} />
        </Sec>}
        {tool === "note" && <Sec title="Comment note"><Color label="Colour" value={styles.note.color} onChange={(c) => upd("note")({ color: c ?? "#fcd34d" })} /><p className="text-[11px] text-slate-500">Click the page to add a note. It is saved as a real PDF comment.</p></Sec>}
        {tool === "link" && <Sec title="Link"><Seg label="Goes to" value={styles.link.kind} onChange={(k) => upd("link")({ kind: k })} options={[{ v: "url", label: "Web address" }, { v: "page", label: "Page" }]} />{styles.link.kind === "url" ? <label className="block"><Label>URL</Label><input className="input !px-2 !py-1 text-xs" value={styles.link.url} onChange={(e) => upd("link")({ url: e.target.value })} /></label> : <Num label={`Page (1–${p.pageCount})`} value={styles.link.page} min={1} max={p.pageCount} onChange={(n) => upd("link")({ page: n })} />}</Sec>}
        {(tool === "field-text" || tool === "field-check") && <Sec title="Form field"><label className="block"><Label>Field name</Label><input className="input !px-2 !py-1 text-xs" value={styles.field.name} onChange={(e) => upd("field")({ name: e.target.value })} /></label>{tool === "field-text" && <Num label="Font size" value={styles.field.fontSize} min={6} max={40} onChange={(n) => upd("field")({ fontSize: n })} />}</Sec>}
      </div>
    );
  }

  const first = sel[0], locked = sel.every((o) => o.locked);
  return (
    <div className="text-sm" onBlurCapture={p.endLive} onPointerUpCapture={p.endLive}>
      <Sec title={sel.length > 1 ? `${sel.length} objects` : label(first)}>
        <div className="flex flex-wrap gap-1">
          <IconBtn title="Duplicate (Ctrl+D)" onClick={() => p.action("duplicate")}><Copy size={14} /></IconBtn>
          <IconBtn title="Bring to front" onClick={() => p.action("front")}><ArrowUpToLine size={14} /></IconBtn>
          <IconBtn title="Forward" onClick={() => p.action("forward")}><ChevronUp size={14} /></IconBtn>
          <IconBtn title="Backward" onClick={() => p.action("backward")}><ChevronDown size={14} /></IconBtn>
          <IconBtn title="Send to back" onClick={() => p.action("back")}><ArrowDownToLine size={14} /></IconBtn>
          <IconBtn title={locked ? "Unlock" : "Lock position"} onClick={() => p.action("lock")}>{locked ? <Unlock size={14} /> : <Lock size={14} />}</IconBtn>
          <IconBtn title="Delete (Del)" danger onClick={() => p.action("delete")}><Trash2 size={14} /></IconBtn>
        </div>
        {first.type === "text" && first.coverId && sel.length === 1 && <button className="btn-ghost w-full text-xs" onClick={() => p.action("revert")}><Undo2 size={13} /> Revert to original text</button>}
      </Sec>

      {sel.length > 1 && (
        <Sec title="Align">
          <div className="flex flex-wrap gap-1">
            {([["left", AlignStartVertical, "Align left"], ["hcenter", AlignCenterVertical, "Centre horizontally"], ["right", AlignEndVertical, "Align right"], ["top", AlignStartHorizontal, "Align top"], ["vcenter", AlignCenterHorizontal, "Centre vertically"], ["bottom", AlignEndHorizontal, "Align bottom"]] as const).map(([k, I, t]) => <IconBtn key={k} title={t} onClick={() => p.action("align:" + k)}><I size={14} /></IconBtn>)}
          </div>
          {sel.length > 2 && <div className="flex gap-1"><button className="btn-ghost flex-1 text-xs" onClick={() => p.action("dist:h")}>Spread horizontally</button><button className="btn-ghost flex-1 text-xs" onClick={() => p.action("dist:v")}>Spread vertically</button></div>}
        </Sec>
      )}

      {one && (
        <Sec title="Position & size">
          <div className="grid grid-cols-2 gap-2">
            <Num label="X" value={one.x} unit="pt" onChange={(v) => p.action(`move:${v - one.x}:0`)} />
            <Num label="Y" value={one.y} unit="pt" onChange={(v) => p.action(`move:0:${v - one.y}`)} />
            {one.type !== "note" && one.type !== "line" && one.type !== "arrow" && one.type !== "ink" && (one.type !== "text" || one.wrap) && <Num label="Width" value={one.w} min={4} unit="pt" onChange={(v) => p.action(`size:${v}:${one.type === "image" ? (v / one.w) * one.h : one.h}`)} />}
            {one.type !== "note" && one.type !== "text" && one.type !== "line" && one.type !== "arrow" && one.type !== "ink" && <Num label="Height" value={one.h} min={4} unit="pt" onChange={(v) => p.action(`size:${one.w}:${v}`)} />}
            {(types.has("text") || ["rect", "ellipse", "image", "cover", "redact", "stamp", "field", "link"].some((t) => types.has(t as Obj["type"]))) && <Num label="Rotation" value={one.rot} min={-360} max={360} unit="°" onChange={(v) => set((o) => ({ ...o, rot: ((v % 360) + 360) % 360 }), true)} />}
          </div>
        </Sec>
      )}
      <Sec title="Appearance"><Range label="Opacity" value={first.opacity} min={0.05} max={1} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set((o) => ({ ...o, opacity: v }), true)} /></Sec>

      {only("text") && <Sec title="Text">
        <label className="block"><Label>Content</Label><textarea className="input !px-2 !py-1 text-xs" rows={3} value={(first as { text: string }).text} onChange={(e) => set((o) => (o.type === "text" ? p.fit({ ...o, text: e.target.value }) : o), true)} /></label>
        <FontControls fb={fb} loadFont={p.loadFont} v={first as never} apply={(part, live) => set((o) => (o.type === "text" ? p.fit({ ...o, ...part } as Obj & { type: "text" }) : o), live)} />
        {one && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={(one as { wrap: boolean }).wrap} onChange={(e) => set((o) => (o.type === "text" ? p.fit({ ...o, wrap: e.target.checked, w: e.target.checked ? Math.max(o.w, 120) : o.w }) : o))} />Wrap text inside a fixed-width box</label>}
        {one && hasNonLatin(one) && <p className="rounded bg-amber-50 p-2 text-[11px] text-amber-900">This text uses characters the standard fonts lack. It will be saved as an image unless you add a font that covers them.</p>}
      </Sec>}
      {only("rect", "ellipse") && <Sec title={types.has("ellipse") && !types.has("rect") ? "Ellipse" : "Shape"}><ShapeControls v={first as never} apply={(part, live) => set((o) => ({ ...o, ...part } as Obj), live)} /></Sec>}
      {only("line", "arrow") && <Sec title="Line"><LineControls v={first as never} arrow={first.type === "arrow"} apply={(part, live) => set((o) => ({ ...o, ...part } as Obj), live)} /></Sec>}
      {only("ink") && <Sec title="Drawing"><Color label="Colour" value={(first as { color: string }).color} onChange={(c, l) => set((o) => ({ ...o, color: c ?? "#000" }) as Obj, l)} /><Num label="Thickness" value={(first as { strokeW: number }).strokeW} min={0.5} max={30} step={0.5} unit="pt" onChange={(v) => set((o) => (o.type === "ink" ? { ...o, strokeW: v } : o), true)} /></Sec>}
      {only("highlight", "underline", "strike") && <Sec title="Markup"><Color label="Colour" value={(first as { color: string }).color} onChange={(c, l) => set((o) => ({ ...o, color: c ?? "#fde047" }) as Obj, l)} /></Sec>}
      {only("cover") && <Sec title="White-out"><Color label="Colour" value={(first as { color: string }).color} onChange={(c, l) => set((o) => ({ ...o, color: c ?? "#fff" }) as Obj, l)} /></Sec>}
      {only("stamp") && <Sec title="Stamp"><label className="block"><Label>Text</Label><input className="input !px-2 !py-1 text-xs" value={(first as { label: string }).label} onChange={(e) => set((o) => (o.type === "stamp" ? { ...o, label: e.target.value.toUpperCase() } : o), true)} /></label><Color label="Colour" value={(first as { color: string }).color} onChange={(c, l) => set((o) => ({ ...o, color: c ?? "#000" }) as Obj, l)} /><Num label="Size" value={(first as { size: number }).size} min={8} max={160} unit="pt" onChange={(v) => set((o) => (o.type === "stamp" ? { ...o, size: v } : o), true)} /></Sec>}
      {only("note") && <Sec title="Comment"><textarea className="input !px-2 !py-1 text-xs" rows={5} placeholder="Write your comment…" value={(first as { text: string }).text} onChange={(e) => set((o) => (o.type === "note" ? { ...o, text: e.target.value } : o), true)} /><Color label="Icon colour" value={(first as { color: string }).color} onChange={(c, l) => set((o) => ({ ...o, color: c ?? "#fcd34d" }) as Obj, l)} /></Sec>}
      {only("link") && one && one.type === "link" && <Sec title="Link"><Seg label="Goes to" value={one.kind} onChange={(k) => set((o) => (o.type === "link" ? { ...o, kind: k } : o))} options={[{ v: "url", label: "Web address" }, { v: "page", label: "Page" }]} />{one.kind === "url" ? <label className="block"><Label>URL</Label><input className="input !px-2 !py-1 text-xs" value={one.url} onChange={(e) => set((o) => (o.type === "link" ? { ...o, url: e.target.value } : o), true)} /></label> : <Num label={`Page (1–${p.pageCount})`} value={one.page} min={1} max={p.pageCount} onChange={(v) => set((o) => (o.type === "link" ? { ...o, page: Math.round(v) } : o), true)} />}<label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={one.border} onChange={(e) => set((o) => (o.type === "link" ? { ...o, border: e.target.checked } : o))} />Draw a border</label></Sec>}
      {only("field") && one && one.type === "field" && <Sec title="Form field"><label className="block"><Label>Field name</Label><input className="input !px-2 !py-1 text-xs" value={one.name} onChange={(e) => set((o) => (o.type === "field" ? { ...o, name: e.target.value } : o), true)} /></label>{one.kind === "text" ? <><label className="block"><Label>Default value</Label><input className="input !px-2 !py-1 text-xs" value={one.value} onChange={(e) => set((o) => (o.type === "field" ? { ...o, value: e.target.value } : o), true)} /></label><Num label="Font size" value={one.fontSize} min={6} max={40} onChange={(v) => set((o) => (o.type === "field" ? { ...o, fontSize: v } : o), true)} /><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={one.multiline} onChange={(e) => set((o) => (o.type === "field" ? { ...o, multiline: e.target.checked } : o))} />Multi-line</label></> : <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={one.value === "true"} onChange={(e) => set((o) => (o.type === "field" ? { ...o, value: e.target.checked ? "true" : "" } : o))} />Checked by default</label>}</Sec>}
      {only("image") && <Sec title="Image"><p className="text-xs text-slate-500">Drag the corner handles to resize (aspect ratio is kept; hold Shift to stretch).</p></Sec>}
    </div>
  );
}

const NAMES: Record<string, string> = { text: "Text", rect: "Rectangle", ellipse: "Ellipse", line: "Line", arrow: "Arrow", ink: "Drawing", highlight: "Highlight", underline: "Underline", strike: "Strikethrough", image: "Image", cover: "White-out", redact: "Redaction", note: "Comment", link: "Link", stamp: "Stamp", field: "Form field" };
const label = (o: Obj) => (o.type === "image" && o.kind === "signature" ? "Signature" : NAMES[o.type]);
function hasNonLatin(o: Obj) { return o.type === "text" && /[^ -~ -ÿ\n\t]/.test(o.text) && !o.font.startsWith("custom:"); }
