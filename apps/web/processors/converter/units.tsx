"use client";
import { useState, type ComponentType } from "react";
import { Num, ResultCard, Select, fmtNum } from "@/components/templates";

const SQFT = 0.09290304;
type Table = Record<string, number>;
// Each factor converts one unit to the base unit (noted per table).
const defs: Record<string, { base: string; units: Table; from: string; to: string }> = {
  "length-converter": { base: "metre", from: "m", to: "ft", units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yard: 0.9144, mile: 1609.344, chain: 20.1168, "nautical mile": 1852 } },
  // 1 marla = 272.25 ft², 1 kanal = 20 marla (Pakistan standard)
  "area-converter": { base: "m²", from: "kanal", to: "marla", units: { "m²": 1, "cm²": 1e-4, "km²": 1e6, "ft²": SQFT, "in²": SQFT / 144, "yard²": 9 * SQFT, acre: 4046.8564224, hectare: 10000, marla: 272.25 * SQFT, kanal: 5445 * SQFT } },
  "weight-converter": { base: "kg", from: "kg", to: "lb", units: { mg: 1e-6, g: 1e-3, kg: 1, tonne: 1000, oz: 0.028349523125, lb: 0.45359237, stone: 6.35029318, tola: 0.01166638, seer: 0.9331, maund: 37.3242 } },
  "volume-converter": { base: "litre", from: "litre", to: "gallon (US)", units: { ml: 1e-3, litre: 1, "m³": 1000, "cm³": 1e-3, "ft³": 28.316846592, "gallon (US)": 3.785411784, "gallon (UK)": 4.54609, "quart (US)": 0.946352946, "pint (US)": 0.473176473, "cup (US)": 0.2365882365 } },
  "speed-converter": { base: "m/s", from: "km/h", to: "mph", units: { "m/s": 1, "km/h": 1 / 3.6, mph: 0.44704, knot: 0.514444444, "ft/s": 0.3048, mach: 340.29 } },
  "data-storage-converter": { base: "byte", from: "MB", to: "MiB", units: { bit: 0.125, byte: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, PB: 1e15, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, TiB: 1024 ** 4 } },
  "time-converter": { base: "second", from: "hour", to: "minute", units: { ms: 1e-3, second: 1, minute: 60, hour: 3600, day: 86400, week: 604800, month: 2629746, year: 31556952 } },
  "angle-converter": { base: "degree", from: "degree", to: "radian", units: { degree: 1, radian: 180 / Math.PI, gradian: 0.9, arcminute: 1 / 60, arcsecond: 1 / 3600, turn: 360 } },
};

function UnitConverter({ id }: { id: string }) {
  const d = defs[id], names = Object.keys(d.units);
  const [v, setV] = useState("1"), [from, setFrom] = useState(d.from), [to, setTo] = useState(d.to);
  const n = parseFloat(v), out = (n * d.units[from]) / d.units[to];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_1fr]">
        <Num label="Value" value={v} onChange={setV} />
        <Select label="From" value={from} onChange={setFrom} options={names} />
        <button className="btn-ghost self-end" onClick={() => { setFrom(to); setTo(from); }}>⇄</button>
        <Select label="To" value={to} onChange={setTo} options={names} />
      </div>
      <ResultCard>{Number.isFinite(out) ? `${v} ${from} = ${fmtNum(out, 10)} ${to}` : "Enter a number"}</ResultCard>
      <details className="text-sm text-slate-600"><summary className="cursor-pointer">All conversions</summary>
        <table className="mt-2 w-full"><tbody>{names.map((u) => <tr key={u} className="border-t"><td className="py-1">{u}</td><td className="text-right font-mono">{Number.isFinite(n) ? fmtNum((n * d.units[from]) / d.units[u], 10) : "—"}</td></tr>)}</tbody></table>
      </details>
    </div>
  );
}

const toC: Record<string, (x: number) => number> = { "°C": (x) => x, "°F": (x) => ((x - 32) * 5) / 9, K: (x) => x - 273.15 };
const fromC: Record<string, (x: number) => number> = { "°C": (x) => x, "°F": (x) => (x * 9) / 5 + 32, K: (x) => x + 273.15 };
function Temperature() {
  const [v, setV] = useState("25"), [from, setFrom] = useState("°C");
  const n = parseFloat(v), c = toC[from](n);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2"><Num label="Temperature" value={v} onChange={setV} /><Select label="Unit" value={from} onChange={setFrom} options={Object.keys(toC)} /></div>
      <div className="grid gap-3 sm:grid-cols-3">{Object.keys(toC).map((u) => <ResultCard key={u}>{Number.isFinite(c) ? fmtNum(fromC[u](c), 6) : "—"} {u}</ResultCard>)}</div>
    </div>
  );
}

const make = (id: string): ComponentType => function Conv() { return <UnitConverter id={id} />; };
export const tools: Record<string, ComponentType> = { "temperature-converter": Temperature };
Object.keys(defs).forEach((id) => (tools[id] = make(id)));
