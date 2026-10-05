"use client";
import { useState } from "react";
import { Field, ResultCard } from "@/components/templates";
// factors to base unit (metre / square metre). Pakistan: 1 marla = 272.25 ft² (25.2929 m²), 1 kanal = 20 marla.
const SQFT = 0.09290304;
const groups = {
  Length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, ft: 0.3048, in: 0.0254, yard: 0.9144, mile: 1609.344, chain: 20.1168 },
  Area: { "m²": 1, "km²": 1e6, "ft²": SQFT, "yard²": 9 * SQFT, acre: 4046.8564224, hectare: 10000, marla: 272.25 * SQFT, kanal: 5445 * SQFT },
} as const;
type G = keyof typeof groups;
export default function LengthArea() {
  const [g, setG] = useState<G>("Area");
  const units = Object.keys(groups[g]);
  const [from, setFrom] = useState("kanal");
  const [to, setTo] = useState("marla");
  const [v, setV] = useState("1");
  const pick = (ng: G) => { setG(ng); const u = Object.keys(groups[ng]); setFrom(u[0]); setTo(u[1]); };
  const f = groups[g] as Record<string, number>;
  const n = parseFloat(v);
  const out = Number.isFinite(n) ? (n * f[from]) / f[to] : NaN;
  return (
    <div className="space-y-4">
      <div className="flex gap-2">{(Object.keys(groups) as G[]).map((k) => <button key={k} className={`btn-ghost ${g === k ? "!border-indigo-500 !bg-indigo-50" : ""}`} onClick={() => pick(k)}>{k}</button>)}</div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Value"><input className="input" value={v} onChange={(e) => setV(e.target.value)} /></Field>
        <Field label="From"><select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select></Field>
        <Field label="To"><select className="input" value={to} onChange={(e) => setTo(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select></Field>
      </div>
      <ResultCard>{Number.isFinite(out) ? `${v} ${from} = ${+out.toPrecision(10)} ${to}` : "Enter a number"}</ResultCard>
    </div>
  );
}
