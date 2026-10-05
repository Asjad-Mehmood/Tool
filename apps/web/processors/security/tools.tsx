"use client";
import { useState, type ComponentType } from "react";
import { FileTool, Stat } from "@/components/templates";

function Strength() {
  const [pw, setPw] = useState(""), [show, setShow] = useState(false);
  const pool = (/[a-z]/.test(pw) ? 26 : 0) + (/[A-Z]/.test(pw) ? 26 : 0) + (/\d/.test(pw) ? 10 : 0) + (/[^A-Za-z0-9]/.test(pw) ? 33 : 0);
  let bits = pw.length * Math.log2(pool || 1);
  const common = /^(password|123456|qwerty|letmein|admin|welcome|iloveyou)/i.test(pw), repeats = /(.)\1{2,}/.test(pw), seq = /(abc|123|qwe|asd|zxc)/i.test(pw);
  if (common) bits = Math.min(bits, 12); if (repeats) bits *= 0.8; if (seq) bits *= 0.85;
  const label = bits < 28 ? "Very weak" : bits < 36 ? "Weak" : bits < 60 ? "Fair" : bits < 80 ? "Strong" : "Very strong";
  const secs = 2 ** bits / 1e10, human = secs < 1 ? "instantly" : secs < 3600 ? `${Math.round(secs / 60) || 1} min` : secs < 86400 * 365 ? `${Math.round(secs / 86400)} days` : secs < 86400 * 365 * 1e6 ? `${Math.round(secs / 31536000).toLocaleString()} years` : "millions of years";
  return (
    <div className="space-y-3">
      <div className="flex gap-2"><input className="input font-mono" type={show ? "text" : "password"} placeholder="Type a password to test" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="off" /><button className="btn-ghost" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button></div>
      {pw && <><div className="h-3 overflow-hidden rounded bg-slate-200"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${Math.min(100, (bits / 100) * 100)}%` }} /></div>
        <div className="grid gap-2 sm:grid-cols-3"><Stat label="Rating" value={label} /><Stat label="Entropy (est.)" value={`${bits.toFixed(0)} bits`} /><Stat label="Offline crack time (10B guesses/s)" value={human} /></div>
        {(common || repeats || seq) && <p className="text-sm text-amber-700">Avoid common words, repeated characters and keyboard/number sequences.</p>}</>}
      <p className="text-xs text-slate-500">Checked entirely in your browser — the password is never sent anywhere. Estimates are approximate.</p>
    </div>
  );
}

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
function FileHash() {
  const [file, setFile] = useState<File>(), [h, setH] = useState<Record<string, string>>({}), [cmp, setCmp] = useState(""), [busy, setBusy] = useState(false);
  const run = async (f: File) => {
    setFile(f); setBusy(true); const buf = await f.arrayBuffer(), r: Record<string, string> = {};
    for (const a of ["SHA-1", "SHA-256", "SHA-512"]) r[a] = hex(await crypto.subtle.digest(a, buf));
    setH(r); setBusy(false);
  };
  const match = cmp.trim() && Object.values(h).some((v) => v === cmp.trim().toLowerCase());
  return (
    <div className="space-y-3">
      <input type="file" className="input" onChange={(e) => e.target.files?.[0] && run(e.target.files[0])} />
      {busy && <p>Hashing…</p>}
      {file && Object.entries(h).map(([k, v]) => <Stat key={k} label={k} value={<span className="font-mono text-sm">{v}</span>} />)}
      {file && <input className="input font-mono" placeholder="Paste expected hash to compare" value={cmp} onChange={(e) => setCmp(e.target.value)} />}
      {cmp.trim() && file && <p className={match ? "font-medium text-emerald-700" : "font-medium text-red-600"}>{match ? "✓ Hash matches" : "✗ No match"}</p>}
    </div>
  );
}
void FileTool;
export const tools: Record<string, ComponentType> = { "password-strength": Strength, "file-hash": FileHash };
