"use client";
import { ArrowDown, ArrowUp, Copy, FilePlus2, FileUp, Lock, RotateCcw, RotateCw, Scissors, Trash2, Unlock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Color, IconBtn, Label, Num, Range, Sec } from "./Inspector";
import { STANDARD_FAMILIES, type FontBook } from "./fonts";
import { parseRange } from "./geometry";
import type { Sources, TextLine } from "./runtime";
import { pageRot, pageSize, type Crop, type EditorDoc, type FormFieldInfo, type FormValues, type HeaderFooter, type ImageAsset, type Meta, type Obj, type PageState, type Rect, type Watermark } from "./types";

/* ---------------- Pages (thumbnails) ---------------- */
function Thumb({ page, index, sources, selected, current, onClick, onDragStart, onDragOver, onDrop, drop }: { page: PageState; index: number; sources: Sources; selected: boolean; current: boolean; onClick: (e: React.MouseEvent) => void; onDragStart: (e: React.DragEvent) => void; onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void; drop: "before" | "after" | null }) {
  const ref = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null), [vis, setVis] = useState(false), size = pageSize(page), W = 112, rot = pageRot(page), key = page.src ? `${page.src.doc}:${page.src.index}` : "b";
  useEffect(() => { const io = new IntersectionObserver(([e]) => e.isIntersecting && setVis(true), { rootMargin: "300px" }); if (ref.current) io.observe(ref.current); return () => io.disconnect(); }, []);
  useEffect(() => {
    if (!vis || !cv.current) return; let dead = false; const c = cv.current, scale = (W * 2) / size.w;
    (async () => {
      c.width = Math.floor(size.w * scale); c.height = Math.floor(size.h * scale);
      if (!page.src) { const g = c.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); return; }
      try { const pp = await sources.page(page.src.doc, page.src.index), vp = pp.getViewport({ scale, rotation: rot }), off = document.createElement("canvas"); off.width = Math.floor(vp.width); off.height = Math.floor(vp.height); await pp.render({ canvasContext: off.getContext("2d")!, viewport: vp, canvas: off }).promise; if (!dead) { c.width = off.width; c.height = off.height; c.getContext("2d")!.drawImage(off, 0, 0); } } catch { /* ignore */ }
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vis, key, rot, size.w, size.h]);
  return (
    <div ref={ref} draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onClick={onClick} className={`relative cursor-pointer rounded-lg p-1.5 text-center ${selected ? "bg-indigo-100" : "hover:bg-slate-100"} ${current ? "ring-2 ring-indigo-500" : ""}`} aria-label={`Page ${index + 1}`}>
      {drop === "before" && <span className="absolute -top-1 left-0 right-0 h-1 rounded bg-indigo-500" />}
      <canvas ref={cv} className="mx-auto block border border-slate-300 bg-white shadow-sm" style={{ width: W, height: (W * size.h) / size.w }} />
      <span className="mt-1 block text-[11px] text-slate-500">{index + 1}{page.objects.length > 0 && <span className="ml-1 rounded-full bg-indigo-600 px-1.5 text-[9px] text-white">{page.objects.length}</span>}</span>
      {drop === "after" && <span className="absolute -bottom-1 left-0 right-0 h-1 rounded bg-indigo-500" />}
    </div>
  );
}

export interface PagesPanelProps {
  doc: EditorDoc; sources: Sources; selected: string[]; current: number;
  onPick: (id: string, e: React.MouseEvent, index: number) => void; onReorder: (ids: string[], toIndex: number) => void;
  onRotate: (dir: 1 | -1) => void; onDelete: () => void; onDuplicate: () => void; onBlank: () => void; onInsertPdf: () => void; onExtract: () => void; onSelectAll: () => void;
}
export function PagesPanel(p: PagesPanelProps) {
  const [drag, setDrag] = useState<string[] | null>(null), [over, setOver] = useState<{ index: number; where: "before" | "after" } | null>(null);
  const n = p.selected.length;
  return (
    <div className="space-y-2 p-2">
      <div className="flex flex-wrap gap-1">
        <IconBtn title="Rotate left" onClick={() => p.onRotate(-1)}><RotateCcw size={14} /></IconBtn>
        <IconBtn title="Rotate right" onClick={() => p.onRotate(1)}><RotateCw size={14} /></IconBtn>
        <IconBtn title="Duplicate" onClick={p.onDuplicate}><Copy size={14} /></IconBtn>
        <IconBtn title="Delete page(s)" danger onClick={p.onDelete}><Trash2 size={14} /></IconBtn>
        <IconBtn title="Insert blank page after" onClick={p.onBlank}><FilePlus2 size={14} /></IconBtn>
        <IconBtn title="Insert pages from another PDF" onClick={p.onInsertPdf}><FileUp size={14} /></IconBtn>
        <IconBtn title="Save only the selected pages" onClick={p.onExtract}><Scissors size={14} /></IconBtn>
      </div>
      <p className="text-[11px] text-slate-500">{n ? `${n} selected` : "Click a page to jump · Ctrl/Shift-click to select several"} · drag to reorder · <button className="underline" onClick={p.onSelectAll}>select all</button></p>
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-1 xl:grid-cols-2">
        {p.doc.pages.map((pg, i) => (
          <Thumb key={pg.id} page={pg} index={i} sources={p.sources} selected={p.selected.includes(pg.id)} current={p.current === i} drop={over?.index === i ? over.where : null}
            onClick={(e) => p.onPick(pg.id, e, i)}
            onDragStart={(e) => { const ids = p.selected.includes(pg.id) ? p.selected : [pg.id]; setDrag(ids); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", ids.join(",")); }}
            onDragOver={(e) => { if (!drag) return; e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setOver({ index: i, where: e.clientY < r.top + r.height / 2 ? "before" : "after" }); }}
            onDrop={(e) => { e.preventDefault(); if (drag && over) p.onReorder(drag, over.where === "before" ? i : i + 1); setDrag(null); setOver(null); }} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Layers ---------------- */
export function LayersPanel({ page, selected, onSelect, onLock, onDelete, onMove }: { page: PageState | undefined; selected: string[]; onSelect: (id: string, add: boolean) => void; onLock: (id: string) => void; onDelete: (id: string) => void; onMove: (id: string, dir: 1 | -1) => void }) {
  if (!page) return null;
  const name = (o: Obj) => (o.type === "text" ? `“${o.text.slice(0, 24) || "(empty)"}”` : o.type === "image" ? (o.kind === "signature" ? "Signature" : "Image") : o.type === "note" ? `Note: ${o.text.slice(0, 18)}` : o.type === "stamp" ? o.label : o.type === "field" ? `Field ${o.name}` : o.type[0].toUpperCase() + o.type.slice(1));
  return (
    <div className="space-y-1 p-2">
      <p className="text-[11px] text-slate-500">Objects on this page (top = in front)</p>
      {!page.objects.length && <p className="text-xs text-slate-400">Nothing added to this page yet.</p>}
      {[...page.objects].reverse().map((o) => (
        <div key={o.id} className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${selected.includes(o.id) ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white"}`}>
          <button className="min-w-0 flex-1 truncate text-left" onClick={(e) => onSelect(o.id, e.shiftKey || e.ctrlKey || e.metaKey)}>{name(o)}</button>
          <button title="Move forward" aria-label="Move forward" onClick={() => onMove(o.id, 1)}><ArrowUp size={12} /></button>
          <button title="Move backward" aria-label="Move backward" onClick={() => onMove(o.id, -1)}><ArrowDown size={12} /></button>
          <button title={o.locked ? "Unlock" : "Lock"} aria-label="Toggle lock" onClick={() => onLock(o.id)}>{o.locked ? <Lock size={12} className="text-amber-600" /> : <Unlock size={12} />}</button>
          <button title="Delete" aria-label="Delete" className="text-red-600" onClick={() => onDelete(o.id)}><Trash2 size={12} /></button>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Find & replace ---------------- */
export interface Hit { pageId: string; pageIndex: number; rect: Rect; line: TextLine; start: number; end: number; snippet: string }
export interface FindPanelProps { onFind: (q: string, cs: boolean, ww: boolean) => Promise<Hit[]>; hits: Hit[]; setHits: (h: Hit[]) => void; active: number; setActive: (i: number) => void; onReplace: (h: Hit[], text: string) => void; busy: boolean; setBusy: (b: boolean) => void }
export function FindPanel(p: FindPanelProps) {
  const [q, setQ] = useState(""), [rep, setRep] = useState(""), [cs, setCs] = useState(false), [ww, setWw] = useState(false), [ran, setRan] = useState(false);
  const run = async () => { p.setBusy(true); p.setHits(await p.onFind(q, cs, ww)); p.setActive(0); setRan(true); p.setBusy(false); };
  return (
    <div className="space-y-3 p-3">
      <label className="block"><Label>Find</Label><input className="input !px-2 !py-1 text-sm" value={q} onChange={(e) => { setQ(e.target.value); setRan(false); }} onKeyDown={(e) => e.key === "Enter" && q && run()} placeholder="Search the document…" /></label>
      <label className="block"><Label>Replace with</Label><input className="input !px-2 !py-1 text-sm" value={rep} onChange={(e) => setRep(e.target.value)} placeholder="New text" /></label>
      <div className="flex gap-3 text-xs"><label className="flex items-center gap-1"><input type="checkbox" checked={cs} onChange={(e) => setCs(e.target.checked)} />Match case</label><label className="flex items-center gap-1"><input type="checkbox" checked={ww} onChange={(e) => setWw(e.target.checked)} />Whole word</label></div>
      <div className="flex gap-2"><button className="btn flex-1 !py-1.5 text-xs" disabled={!q || p.busy} onClick={run}>{p.busy ? "Searching…" : "Find all"}</button>
        <button className="btn-ghost flex-1 text-xs" disabled={!p.hits.length} onClick={() => p.onReplace([p.hits[p.active]], rep)}>Replace</button>
        <button className="btn-ghost flex-1 text-xs" disabled={!p.hits.length} onClick={() => p.onReplace(p.hits, rep)}>Replace all</button></div>
      {ran && <p className="text-xs text-slate-500">{p.hits.length ? `${p.hits.length} match${p.hits.length === 1 ? "" : "es"}` : "No matches found."}</p>}
      <ul className="max-h-72 space-y-1 overflow-auto">{p.hits.map((h, i) => <li key={i}><button className={`w-full rounded border px-2 py-1 text-left text-xs ${i === p.active ? "border-orange-400 bg-orange-50" : "border-slate-200 bg-white hover:bg-slate-50"}`} onClick={() => p.setActive(i)}><span className="mr-1 font-semibold text-slate-500">p.{h.pageIndex + 1}</span>{h.snippet}</button></li>)}</ul>
      <p className="text-[11px] text-slate-500">Replacing covers the original text and writes the new text in a matching standard font. Check the result — fonts and spacing may differ slightly. Scanned PDFs need OCR first.</p>
    </div>
  );
}

/* ---------------- Forms ---------------- */
export function FormsPanel({ fields, values, onChange, flatten, setFlatten }: { fields: FormFieldInfo[]; values: FormValues; onChange: (name: string, v: string | boolean) => void; flatten: boolean; setFlatten: (b: boolean) => void }) {
  return (
    <div className="space-y-3 p-3">
      {!fields.length ? <p className="text-xs text-slate-500">This PDF has no fillable form fields. Use the Form tools in the toolbar to add text fields and checkboxes.</p> : (
        <>
          <p className="text-xs text-slate-500">Fill in the form fields of this PDF.</p>
          {fields.filter((f) => f.kind !== "button" && f.kind !== "other").map((f) => {
            const v = f.name in values ? values[f.name] : f.value;
            return (
              <label key={f.name} className="block text-xs"><Label>{f.name}{f.readOnly ? " (read-only)" : ""}</Label>
                {f.kind === "checkbox" ? <input type="checkbox" disabled={f.readOnly} checked={Boolean(v)} onChange={(e) => onChange(f.name, e.target.checked)} />
                  : f.options ? <select className="input !px-2 !py-1 text-xs" disabled={f.readOnly} value={String(v)} onChange={(e) => onChange(f.name, e.target.value)}><option value="">—</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
                    : <input className="input !px-2 !py-1 text-xs" disabled={f.readOnly} value={String(v)} onChange={(e) => onChange(f.name, e.target.value)} />}
              </label>
            );
          })}
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={flatten} onChange={(e) => setFlatten(e.target.checked)} />Flatten the form when saving (make answers permanent)</label>
        </>
      )}
    </div>
  );
}

/* ---------------- Document: metadata, header/footer, watermark, crop ---------------- */
export interface DocPanelProps {
  meta: Meta; setMeta: (m: Meta) => void; wm: Watermark; setWm: (w: Watermark, live?: boolean) => void; hf: HeaderFooter; setHf: (h: HeaderFooter, live?: boolean) => void; fb: FontBook;
  assets: Map<string, ImageAsset>; pickWatermarkImage: () => void; pageCount: number; selectedCount: number; onCrop: (c: Crop | null, scope: "selected" | "all") => void; onPreviewCrop: (c: Crop | null) => void; endLive: () => void;
}
export function DocumentPanel(p: DocPanelProps) {
  const { meta, wm, hf } = p, [crop, setCrop] = useState<Crop>({ t: 0, r: 0, b: 0, l: 0 });
  const T = (k: keyof Meta, label: string) => <label className="block"><Label>{label}</Label><input className="input !px-2 !py-1 text-xs" value={meta[k]} onChange={(e) => p.setMeta({ ...meta, [k]: e.target.value })} /></label>;
  const H = (k: "tl" | "tc" | "tr" | "bl" | "bc" | "br", label: string) => <label className="block"><Label>{label}</Label><input className="input !px-2 !py-1 text-xs" value={hf[k]} onChange={(e) => p.setHf({ ...hf, [k]: e.target.value }, true)} /></label>;
  const upCrop = (k: keyof Crop, v: number) => { const c = { ...crop, [k]: Math.max(0, v) }; setCrop(c); p.onPreviewCrop(c); };
  return (
    <div onBlurCapture={p.endLive} onPointerUpCapture={p.endLive}>
      <Sec title="Document properties">{T("title", "Title")}{T("author", "Author")}{T("subject", "Subject")}{T("keywords", "Keywords (comma separated)")}{T("creator", "Creator")}</Sec>
      <Sec title="Headers, footers & page numbers">
        <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={hf.enabled} onChange={(e) => p.setHf({ ...hf, enabled: e.target.checked })} />Add to the saved PDF</label>
        {hf.enabled && <>
          <p className="text-[11px] text-slate-500">Tokens: <code>{"{page}"}</code> <code>{"{pages}"}</code> <code>{"{date}"}</code> <code>{"{title}"}</code></p>
          <div className="grid grid-cols-3 gap-1">{H("tl", "Header left")}{H("tc", "Header centre")}{H("tr", "Header right")}{H("bl", "Footer left")}{H("bc", "Footer centre")}{H("br", "Footer right")}</div>
          <div className="grid grid-cols-2 gap-2"><Num label="Size" value={hf.size} min={6} max={36} unit="pt" onChange={(v) => p.setHf({ ...hf, size: v }, true)} /><Num label="Margin" value={hf.margin} min={8} max={120} unit="pt" onChange={(v) => p.setHf({ ...hf, margin: v }, true)} /><Num label="First number" value={hf.startAt} min={0} max={9999} onChange={(v) => p.setHf({ ...hf, startAt: Math.round(v) }, true)} />
            <label className="block"><Label>Pages (blank = all)</Label><input className="input !px-2 !py-1 text-xs" placeholder="e.g. 2-" value={hf.range} onChange={(e) => p.setHf({ ...hf, range: e.target.value }, true)} /></label></div>
          <label className="block"><Label>Font</Label><select className="input !px-2 !py-1 text-xs" value={hf.font} onChange={(e) => p.setHf({ ...hf, font: e.target.value })}>{STANDARD_FAMILIES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}{[...p.fb.customs.values()].map((f) => <option key={f.key} value={f.key}>{f.name}</option>)}</select></label>
          <Color label="Colour" value={hf.color} onChange={(c, l) => p.setHf({ ...hf, color: c ?? "#444444" }, l)} />
        </>}
      </Sec>
      <Sec title="Watermark">
        <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={wm.enabled} onChange={(e) => p.setWm({ ...wm, enabled: e.target.checked })} />Add to the saved PDF</label>
        {wm.enabled && <>
          <div className="flex gap-1">{(["text", "image"] as const).map((k) => <button key={k} className={`btn-ghost flex-1 text-xs ${wm.kind === k ? "!bg-indigo-600 !text-white" : ""}`} onClick={() => p.setWm({ ...wm, kind: k })}>{k === "text" ? "Text" : "Image"}</button>)}</div>
          {wm.kind === "text" ? <label className="block"><Label>Text</Label><input className="input !px-2 !py-1 text-xs" value={wm.text} onChange={(e) => p.setWm({ ...wm, text: e.target.value }, true)} /></label>
            : <div className="space-y-1"><button className="btn-ghost w-full text-xs" onClick={p.pickWatermarkImage}>{wm.imgId ? "Change image…" : "Choose image…"}</button>{wm.imgId && p.assets.get(wm.imgId) && <img src={p.assets.get(wm.imgId)!.url} alt="Watermark" className="max-h-16 bg-slate-100" />}</div>}
          <div className="grid grid-cols-2 gap-2">{wm.kind === "text" && <Num label="Size" value={wm.size} min={10} max={400} unit="pt" onChange={(v) => p.setWm({ ...wm, size: v }, true)} />}<Num label="Angle" value={wm.rotation} min={-180} max={180} unit="°" onChange={(v) => p.setWm({ ...wm, rotation: v }, true)} /></div>
          <Range label="Opacity" value={wm.opacity} min={0.05} max={1} step={0.05} onChange={(v) => p.setWm({ ...wm, opacity: v }, true)} fmt={(v) => `${Math.round(v * 100)}%`} />
          {wm.kind === "text" && <Color label="Colour" value={wm.color} onChange={(c, l) => p.setWm({ ...wm, color: c ?? "#888888" }, l)} />}
          <label className="block"><Label>Pages (blank = all)</Label><input className="input !px-2 !py-1 text-xs" placeholder="e.g. 1,3-5" value={wm.range} onChange={(e) => p.setWm({ ...wm, range: e.target.value }, true)} /></label>
        </>}
      </Sec>
      <Sec title="Crop pages">
        <div className="grid grid-cols-2 gap-2"><Num label="Top" value={crop.t} min={0} unit="pt" onChange={(v) => upCrop("t", v)} /><Num label="Bottom" value={crop.b} min={0} unit="pt" onChange={(v) => upCrop("b", v)} /><Num label="Left" value={crop.l} min={0} unit="pt" onChange={(v) => upCrop("l", v)} /><Num label="Right" value={crop.r} min={0} unit="pt" onChange={(v) => upCrop("r", v)} /></div>
        <div className="flex flex-wrap gap-1"><button className="btn-ghost flex-1 text-xs" disabled={!p.selectedCount} onClick={() => { p.onCrop(crop, "selected"); p.onPreviewCrop(null); }}>Apply to {p.selectedCount || 0} selected</button><button className="btn-ghost flex-1 text-xs" onClick={() => { p.onCrop(crop, "all"); p.onPreviewCrop(null); }}>Apply to all {p.pageCount}</button><button className="btn-ghost w-full text-xs" onClick={() => { setCrop({ t: 0, r: 0, b: 0, l: 0 }); p.onCrop(null, "all"); p.onPreviewCrop(null); }}>Remove cropping</button></div>
        <p className="text-[11px] text-slate-500">Select pages in the Pages tab first. A preview shows on the current page while you adjust.</p>
      </Sec>
    </div>
  );
}
void parseRange;
