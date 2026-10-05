"use client";
import { useCallback, useEffect, useState } from "react";
import { Field, ResultCard } from "@/components/templates";
const sets = { lower: "abcdefghijklmnopqrstuvwxyz", upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", digits: "0123456789", symbols: "!@#$%^&*()-_=+[]{};:,.?" } as const;
function rand(n: number) { const lim = Math.floor(0x100000000 / n) * n; const a = new Uint32Array(1); do crypto.getRandomValues(a); while (a[0] >= lim); return a[0] % n; }
export default function PasswordGenerator() {
  const [len, setLen] = useState(16);
  const [on, setOn] = useState<Record<keyof typeof sets, boolean>>({ lower: true, upper: true, digits: true, symbols: true });
  const [pw, setPw] = useState("");
  const gen = useCallback(() => {
    const chosen = (Object.keys(sets) as (keyof typeof sets)[]).filter((k) => on[k]);
    if (!chosen.length) return setPw("");
    const pool = chosen.map((k) => sets[k]).join("");
    const out = chosen.map((k) => sets[k][rand(sets[k].length)]);
    while (out.length < len) out.push(pool[rand(pool.length)]);
    for (let i = out.length - 1; i > 0; i--) { const j = rand(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
    setPw(out.slice(0, len).join(""));
  }, [len, on]);
  useEffect(gen, [gen]);
  return (
    <div className="space-y-4">
      <ResultCard><span className="break-all font-mono">{pw || "Select at least one option"}</span></ResultCard>
      <Field label={`Length: ${len}`}><input type="range" min={6} max={64} value={len} onChange={(e) => setLen(+e.target.value)} className="w-full" /></Field>
      <div className="flex flex-wrap gap-4 text-sm">
        {(Object.keys(sets) as (keyof typeof sets)[]).map((k) => <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={on[k]} onChange={(e) => setOn({ ...on, [k]: e.target.checked })} />{k}</label>)}
      </div>
      <div className="flex gap-2"><button className="btn" onClick={gen}>Regenerate</button><button className="btn-ghost" onClick={() => navigator.clipboard.writeText(pw)}>Copy</button></div>
    </div>
  );
}
