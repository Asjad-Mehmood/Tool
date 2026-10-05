"use client";
import { useRef, useState } from "react";

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
  return <div className="card bg-indigo-50 text-lg font-semibold">{children}</div>;
}

export function FileTool({ accept, multiple, actionLabel, run }: {
  accept: string; multiple?: boolean; actionLabel: string;
  run: (files: File[]) => Promise<Blob>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string>();
  const [err, setErr] = useState<string>();
  const ref = useRef<HTMLInputElement>(null);
  const add = (list: FileList | null) => { if (list) { setFiles((f) => multiple ? [...f, ...Array.from(list)] : Array.from(list)); setUrl(undefined); } };
  const go = async () => {
    setBusy(true); setErr(undefined);
    try { setUrl(URL.createObjectURL(await run(files))); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  const move = (i: number, d: number) => setFiles((f) => { const n = [...f]; const j = i + d; if (j < 0 || j >= n.length) return f; [n[i], n[j]] = [n[j], n[i]]; return n; });
  return (
    <div className="space-y-4">
      <div className="card cursor-pointer border-dashed py-10 text-center text-slate-500"
        onClick={() => ref.current?.click()} onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}>
        Drop files here or click to browse
        <input ref={ref} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => add(e.target.files)} />
      </div>
      {files.map((f, i) => (
        <div key={i} className="card flex items-center justify-between py-2 text-sm">
          <span>{f.name} <span className="text-slate-400">({(f.size / 1024).toFixed(0)} KB)</span></span>
          <span className="flex gap-1">
            <button className="btn-ghost" onClick={() => move(i, -1)}>↑</button>
            <button className="btn-ghost" onClick={() => move(i, 1)}>↓</button>
            <button className="btn-ghost" onClick={() => setFiles(files.filter((_, k) => k !== i))}>✕</button>
          </span>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button className="btn" disabled={!files.length || busy} onClick={go}>{busy ? "Processing…" : actionLabel}</button>
        {url && <a className="btn !bg-emerald-600" href={url} download="result.pdf">Download</a>}
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </div>
  );
}
