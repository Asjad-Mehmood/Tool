"use client";
import { useState } from "react";
import Link from "next/link";

interface Key { id: string; name: string; prefix: string; lastUsed: string | null; createdAt: string }

export default function ApiKeys({ initial, allowed }: { initial: Key[]; allowed: boolean }) {
  const [keys, setKeys] = useState(initial), [name, setName] = useState(""), [fresh, setFresh] = useState(""), [err, setErr] = useState("");
  const create = async () => {
    setErr(""); const r = await fetch("/api/keys", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }), j = await r.json();
    if (!r.ok) return setErr(j.error ?? "Failed"); setFresh(j.key); setName(""); setKeys([j.record, ...keys]);
  };
  const revoke = async (id: string) => { await fetch("/api/keys", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) }); setKeys(keys.filter((k) => k.id !== id)); };
  return (
    <section aria-labelledby="api-h"><h2 id="api-h" className="section-title mb-3">API keys</h2>
      {!allowed ? <p className="card text-sm text-slate-600">The public API is available on Pro and Team. <Link className="text-indigo-600 underline" href="/pricing">See plans</Link> · <Link className="text-indigo-600 underline" href="/docs/api">API docs</Link></p> : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2"><input className="input max-w-xs" placeholder="Key name (e.g. my-app)" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn" onClick={create} disabled={!name.trim()}>Create key</button><Link className="btn-ghost" href="/docs/api">API docs</Link></div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          {fresh && <div className="rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900" role="status"><p className="font-semibold">Copy your key now — it won’t be shown again.</p><code className="mt-1 block break-all">{fresh}</code></div>}
          {keys.length > 0 && <ul className="card divide-y divide-slate-200 !p-0 text-sm">{keys.map((k) => <li key={k.id} className="flex items-center justify-between gap-3 px-4 py-2"><span><b>{k.name}</b> <code className="text-slate-500">{k.prefix}…</code><span className="ml-2 text-xs text-slate-400">{k.lastUsed ? `used ${new Date(k.lastUsed).toLocaleDateString()}` : "never used"}</span></span><button className="btn-ghost" onClick={() => revoke(k.id)}>Revoke</button></li>)}</ul>}
        </div>
      )}
    </section>
  );
}
