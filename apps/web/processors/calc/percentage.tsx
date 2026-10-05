"use client";
import { useState } from "react";
import { Field, ResultCard } from "@/components/templates";
const fmt = (n: number) => (Number.isFinite(n) ? +n.toFixed(6) : "—");
export default function Percentage() {
  const [a, setA] = useState("10"), [b, setB] = useState("200"), [c, setC] = useState("50"), [d, setD] = useState("200");
  const [e, setE] = useState("100"), [f, setF] = useState("150");
  return (
    <div className="space-y-6">
      <div className="space-y-2"><div className="flex flex-wrap items-end gap-2">What is <input className="input !w-24" value={a} onChange={(x) => setA(x.target.value)} /> % of <input className="input !w-28" value={b} onChange={(x) => setB(x.target.value)} /> ?</div><ResultCard>{fmt((+a / 100) * +b)}</ResultCard></div>
      <div className="space-y-2"><div className="flex flex-wrap items-end gap-2"><input className="input !w-24" value={c} onChange={(x) => setC(x.target.value)} /> is what % of <input className="input !w-28" value={d} onChange={(x) => setD(x.target.value)} /> ?</div><ResultCard>{fmt((+c / +d) * 100)}%</ResultCard></div>
      <div className="space-y-2"><div className="flex flex-wrap items-end gap-2">Change from <input className="input !w-24" value={e} onChange={(x) => setE(x.target.value)} /> to <input className="input !w-28" value={f} onChange={(x) => setF(x.target.value)} /></div><ResultCard>{fmt(((+f - +e) / Math.abs(+e)) * 100)}%</ResultCard></div>
    </div>
  );
}
