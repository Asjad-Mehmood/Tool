"use client";
import { useState } from "react";
import { Field, ResultCard } from "@/components/templates";
export default function Dms() {
  const [dd, setDd] = useState("25.276987");
  const [d, setD] = useState("55"), [m, setM] = useState("17"), [s, setS] = useState("32.35"), [hemi, setHemi] = useState<1 | -1>(1);
  const n = parseFloat(dd);
  const abs = Math.abs(n), deg = Math.floor(abs), min = Math.floor((abs - deg) * 60), sec = ((abs - deg) * 60 - min) * 60;
  const dec = hemi * (Math.abs(+d) + +m / 60 + +s / 3600);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3"><h3 className="font-semibold">Decimal → DMS</h3>
        <Field label="Decimal degrees"><input className="input" value={dd} onChange={(e) => setDd(e.target.value)} /></Field>
        <ResultCard>{Number.isFinite(n) ? `${n < 0 ? "-" : ""}${deg}° ${min}′ ${sec.toFixed(4)}″` : "—"}</ResultCard></div>
      <div className="space-y-3"><h3 className="font-semibold">DMS → Decimal</h3>
        <div className="grid grid-cols-4 gap-2">
          <Field label="°"><input className="input" value={d} onChange={(e) => setD(e.target.value)} /></Field>
          <Field label="′"><input className="input" value={m} onChange={(e) => setM(e.target.value)} /></Field>
          <Field label="″"><input className="input" value={s} onChange={(e) => setS(e.target.value)} /></Field>
          <Field label="Sign"><select className="input" value={hemi} onChange={(e) => setHemi(+e.target.value as 1 | -1)}><option value={1}>N / E (+)</option><option value={-1}>S / W (−)</option></select></Field>
        </div>
        <ResultCard>{Number.isFinite(dec) ? dec.toFixed(8) : "—"}</ResultCard></div>
    </div>
  );
}
