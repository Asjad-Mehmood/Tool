"use client";
import { useEffect, useRef, useState } from "react";

export function TextTool({ transform, placeholder, actions }: {
  transform: (input: string, action?: string) => string;
  placeholder?: string;
  actions?: { id: string; label: string }[];
}) {
  const [input, setInput] = useState("");
  const [action, setAction] = useState(actions?.[0]?.id);
  const output = (() => { try { return transform(input, action); } catch (e) { return `Error: ${(e as Error).message}`; } })();
  return (
    <div className="space-y-3">
      {actions && (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <button key={a.id} className={`btn-ghost ${action === a.id ? "!border-indigo-500 !bg-indigo-50" : ""}`} onClick={() => setAction(a.id)}>{a.label}</button>
          ))}
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <textarea className="input h-64 font-mono" placeholder={placeholder ?? "Input"} value={input} onChange={(e) => setInput(e.target.value)} />
        <div className="relative">
          <textarea className="input h-64 font-mono" readOnly value={output} />
          <button className="btn-ghost absolute right-2 top-2" onClick={() => navigator.clipboard.writeText(output)}>Copy</button>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span>{children}</label>;
}

export function ResultCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-lg font-semibold text-slate-900">{children}</div>;
}

export type Output = { blob: Blob; name: string };

export function FileTool({ accept, multiple, actionLabel, run, extra, minFiles = 1, noFiles, onFiles }: {
  accept?: string; multiple?: boolean; actionLabel: string; extra?: React.ReactNode; minFiles?: number; noFiles?: boolean; onFiles?: (files: File[]) => void;
  run: (files: File[], onProgress: (msg: string) => void) => Promise<Output | Output[]>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [outs, setOuts] = useState<(Output & { url: string })[]>([]);
  const [err, setErr] = useState<string>();
  const [msg, setMsg] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { onFiles?.(files); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [files]);
  const add = (list: FileList | null) => { if (list) { setFiles((f) => (multiple ? [...f, ...Array.from(list)] : Array.from(list).slice(0, 1))); setOuts([]); } };
  const go = async () => {
    setBusy(true); setErr(undefined); setMsg("");
    try {
      const r = await run(files, setMsg);
      setOuts((Array.isArray(r) ? r : [r]).map((o) => ({ ...o, url: URL.createObjectURL(o.blob) })));
    } catch (e) { setErr((e as Error).message || String(e)); }
    setBusy(false);
  };
  const move = (i: number, d: number) => setFiles((f) => { const n = [...f]; const j = i + d; if (j < 0 || j >= n.length) return f; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const zipAll = async () => { const { default: JSZip } = await import("jszip"); const z = new JSZip(); outs.forEach((o) => z.file(o.name, o.blob)); download(await z.generateAsync({ type: "blob" }), "toolhub-results.zip"); };
  return (
    <div className="space-y-4">
      {!noFiles && (
        <div className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50"
          onClick={() => ref.current?.click()} onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}>
          <span className="text-3xl">⬆️</span><span className="font-medium text-slate-700">Drop {multiple ? "files" : "a file"} here</span><span className="text-sm">or click to browse</span>
          <input ref={ref} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        </div>
      )}
      {files.map((f, i) => (
        <div key={i} className="card flex items-center justify-between py-2 text-sm">
          <span>{f.name} <span className="text-slate-400">({(f.size / 1024).toFixed(0)} KB)</span></span>
          <span className="flex gap-1">
            {multiple && <><button className="btn-ghost" onClick={() => move(i, -1)}>↑</button><button className="btn-ghost" onClick={() => move(i, 1)}>↓</button></>}
            <button className="btn-ghost" onClick={() => setFiles(files.filter((_, k) => k !== i))}>✕</button>
          </span>
        </div>
      ))}
      {extra}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={(!noFiles && files.length < minFiles) || busy} onClick={go}>{busy ? "Processing…" : actionLabel}</button>
        {busy && msg && <span className="text-sm text-slate-500">{msg}</span>}
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
      {outs.length > 0 && (
        <div className="space-y-2">
          {outs.map((o, i) => <div key={i} className="card flex items-center justify-between py-2 text-sm"><span>{o.name} <span className="text-slate-400">({(o.blob.size / 1024).toFixed(0)} KB)</span></span><a className="btn !bg-emerald-600" href={o.url} download={o.name}>Download</a></div>)}
          {outs.length > 1 && <button className="btn-ghost" onClick={zipAll}>Download all as ZIP</button>}
        </div>
      )}
    </div>
  );
}

export function Num({ label, value, onChange, step }: { label: string; value: string; onChange: (v: string) => void; step?: string }) {
  return <Field label={label}><input className="input" inputMode="decimal" step={step} value={value} onChange={(e) => onChange(e.target.value)} /></Field>;
}

export function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[] }) {
  return (
    <Field label={label}>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => { const v = typeof o === "string" ? { value: o, label: o } : o; return <option key={v.value} value={v.value}>{v.label}</option>; })}
      </select>
    </Field>
  );
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="card py-2"><div className="text-xs text-slate-500">{label}</div><div className="text-lg font-semibold break-all">{value}</div></div>;
}

export function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export const fmtNum = (n: number, digits = 8) => (Number.isFinite(n) ? String(+n.toPrecision(digits)) : "—");
