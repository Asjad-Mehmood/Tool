"use client";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { getTool, tools as registry } from "@toolhub/registry";
import { Field, Select } from "@/components/templates";

type Phase = { kind: "idle" } | { kind: "uploading"; pct: number } | { kind: "queued" } | { kind: "processing"; pct: number } | { kind: "done"; url: string; name: string } | { kind: "error"; msg: string };

function putFile(url: string, file: File, onPct: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.upload.onprogress = (e) => e.lengthComputable && onPct(Math.round((e.loaded / e.total) * 100));
    x.onload = () => (x.status < 300 ? resolve() : reject(new Error("Upload failed")));
    x.onerror = () => reject(new Error("Upload failed — check your connection"));
    x.send(file);
  });
}

function ServerTool({ slug }: { slug: string }) {
  const tool = getTool(slug)!;
  const [files, setFiles] = useState<File[]>([]);
  const [opts, setOpts] = useState<Record<string, string>>(() => Object.fromEntries((tool.options ?? []).map((o) => [o.key, String(o.default)])));
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const ref = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const busy = phase.kind === "uploading" || phase.kind === "queued" || phase.kind === "processing";

  const poll = (id: string, tries = 0) => {
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/jobs/${id}`), j = await r.json();
        if (j.status === "done") setPhase({ kind: "done", url: j.downloadUrl, name: j.name });
        else if (j.status === "failed" || r.status === 404) setPhase({ kind: "error", msg: j.error ?? "This job expired — please try again" });
        else if (tries > 240) setPhase({ kind: "error", msg: "Timed out waiting for the result" });
        else { setPhase(j.status === "queued" ? { kind: "queued" } : { kind: "processing", pct: j.progress ?? 0 }); poll(id, tries + 1); }
      } catch { setPhase({ kind: "error", msg: "Lost connection to the server" }); }
    }, 1000);
  };

  const go = async () => {
    try {
      setPhase({ kind: "uploading", pct: 0 });
      const up = await fetch("/api/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tool: slug, files: files.map((f) => ({ name: f.name, size: f.size })) }) });
      const uj = await up.json(); if (!up.ok) throw new Error(uj.error ?? "Upload rejected");
      await Promise.all((uj.uploads as { key: string; url: string }[]).map((u, i) => putFile(u.url, files[i], (p) => setPhase({ kind: "uploading", pct: p }))));
      const jr = await fetch("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tool: slug, fileKeys: uj.uploads.map((u: { key: string }) => u.key), fileNames: files.map((f) => f.name), options: opts }) });
      const jj = await jr.json(); if (!jr.ok) throw new Error(jj.error ?? "Could not start job");
      setPhase({ kind: "queued" }); poll(jj.jobId);
    } catch (e) { setPhase({ kind: "error", msg: (e as Error).message }); }
  };

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">☁️ This tool runs on our servers. Files are encrypted in transit and deleted automatically within 1 hour.</p>
      <div className="card cursor-pointer border-dashed py-10 text-center text-slate-500" onClick={() => ref.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFiles(Array.from(e.dataTransfer.files).slice(0, tool.multiple ? 20 : 1)); setPhase({ kind: "idle" }); }}>
        Drop a file here or click to browse ({tool.accept?.join(", ")}, max {tool.limits?.freeMB} MB)
        <input ref={ref} type="file" hidden accept={tool.accept?.join(",")} onChange={(e) => { setFiles(Array.from(e.target.files ?? []).slice(0, tool.multiple ? 20 : 1)); setPhase({ kind: "idle" }); }} />
      </div>
      {files.map((f, i) => <div key={i} className="card py-2 text-sm">{f.name} <span className="text-slate-400">({(f.size / 1048576).toFixed(1)} MB)</span></div>)}
      {(tool.options ?? []).map((o) => o.type === "select" ? <Select key={o.key} label={o.label} value={opts[o.key]} onChange={(v) => setOpts({ ...opts, [o.key]: v })} options={o.choices ?? []} /> : <Field key={o.key} label={o.label}><input className="input" type={o.key.toLowerCase().includes("password") ? "password" : "text"} value={opts[o.key]} onChange={(e) => setOpts({ ...opts, [o.key]: e.target.value })} /></Field>)}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={!files.length || busy} onClick={go}>{busy ? "Working…" : "Process on server"}</button>
        {phase.kind === "uploading" && <span className="text-sm text-slate-500">Uploading {phase.pct}%</span>}
        {phase.kind === "queued" && <span className="text-sm text-slate-500">Waiting in queue…</span>}
        {phase.kind === "processing" && <span className="text-sm text-slate-500">Processing {phase.pct}%</span>}
        {phase.kind === "done" && <a className="btn !bg-emerald-600" href={phase.url} download={phase.name}>Download {phase.name}</a>}
        {phase.kind === "error" && <span className="text-sm text-red-600">{phase.msg}</span>}
      </div>
    </div>
  );
}

function NetTool({ slug }: { slug: string }) {
  const tool = getTool(slug)!, needsInput = slug !== "whats-my-ip";
  const [input, setInput] = useState(""), [res, setRes] = useState<Record<string, unknown> | null>(null), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setErr(""); setRes(null);
    try {
      const r = await fetch(`/api/net/${slug}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input }) }), j = await r.json();
      if (!r.ok) setErr(j.error ?? "Request failed"); else setRes(j);
    } catch { setErr("Request failed"); }
    setBusy(false);
  };
  useEffect(() => { if (!needsInput) go(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  return (
    <div className="space-y-4">
      {needsInput && <div className="flex gap-2"><input className="input" placeholder={slug === "http-headers-checker" ? "https://example.com" : "example.com"} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && input && go()} /><button className="btn" disabled={!input || busy} onClick={go}>{busy ? "Checking…" : "Check"}</button></div>}
      {err && <p className="text-red-600">{err}</p>}
      {res && slug === "whats-my-ip" && <div className="card bg-indigo-50 text-2xl font-semibold">{String(res.ip)}</div>}
      {res && slug !== "whats-my-ip" && <pre className="card max-h-[32rem] overflow-auto text-xs">{JSON.stringify(res, null, 2)}</pre>}
      <p className="text-xs text-slate-500">{tool.title} runs from our server and only contacts public internet addresses.</p>
    </div>
  );
}

export const tools: Record<string, ComponentType> = {};
for (const t of registry) {
  if (t.engine !== "server") continue;
  const slug = t.slug;
  tools[slug] = t.ui === "file" ? () => <ServerTool slug={slug} /> : () => <NetTool slug={slug} />;
}
