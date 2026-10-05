"use client";
import { useState, type ComponentType } from "react";
import { Field, Num, ResultCard, Select, Stat, fmtNum } from "@/components/templates";
import { convert, destination, haversine, initialBearing, systemOptions, toDms, utmZone } from "@/lib-geo";

function CoordinateConverter() {
  const [from, setFrom] = useState("EPSG:4326"), [to, setTo] = useState("UTM-40N");
  const [x, setX] = useState("55.2708"), [y, setY] = useState("25.2048");
  let out: [number, number] | null = null, err = "";
  const X = parseFloat(x), Y = parseFloat(y);
  if (Number.isFinite(X) && Number.isFinite(Y)) { try { out = convert(from, to, X, Y); if (!out.every(Number.isFinite)) throw new Error("Out of range"); } catch (e) { err = (e as Error).message; out = null; } }
  const geo = from === "EPSG:4326";
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2"><Select label="From system" value={from} onChange={setFrom} options={systemOptions} /><Select label="To system" value={to} onChange={setTo} options={systemOptions} /></div>
      <div className="grid gap-3 sm:grid-cols-2"><Num label={geo ? "Longitude (X)" : "Easting (X)"} value={x} onChange={setX} /><Num label={geo ? "Latitude (Y)" : "Northing (Y)"} value={y} onChange={setY} /></div>
      {out ? <div className="grid gap-2 sm:grid-cols-2"><Stat label="X / Easting / Longitude" value={out[0].toFixed(to === "EPSG:4326" ? 8 : 3)} /><Stat label="Y / Northing / Latitude" value={out[1].toFixed(to === "EPSG:4326" ? 8 : 3)} /></div> : <p className="text-red-600">{err || "Enter coordinates"}</p>}
      {geo && Number.isFinite(X) && <p className="text-sm text-slate-500">Suggested UTM zone: {utmZone(X)}{Y < 0 ? "S" : "N"}</p>}
    </div>
  );
}

const Dms = () => {
  const [dd, setDd] = useState("25.276987"), [d, setD] = useState("55"), [m, setM] = useState("17"), [s, setS] = useState("32.35"), [sign, setSign] = useState("1");
  const n = parseFloat(dd), dec = +sign * (Math.abs(+d) + +m / 60 + +s / 3600);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3"><h3 className="font-semibold">Decimal → DMS</h3><Num label="Decimal degrees" value={dd} onChange={setDd} /><ResultCard>{Number.isFinite(n) ? toDms(n) : "—"}</ResultCard></div>
      <div className="space-y-3"><h3 className="font-semibold">DMS → Decimal</h3>
        <div className="grid grid-cols-4 gap-2"><Num label="°" value={d} onChange={setD} /><Num label="′" value={m} onChange={setM} /><Num label="″" value={s} onChange={setS} /><Select label="Sign" value={sign} onChange={setSign} options={[{ value: "1", label: "N / E +" }, { value: "-1", label: "S / W −" }]} /></div>
        <ResultCard>{Number.isFinite(dec) ? dec.toFixed(8) : "—"}</ResultCard></div>
    </div>
  );
};

function BearingDistance() {
  const [mode, setMode] = useState("geo");
  const [a, setA] = useState(["25.2048", "55.2708"]), [b, setB] = useState(["24.4539", "54.3773"]);
  const [p, setP] = useState(["1000", "1000"]), [q, setQ] = useState(["1500", "1866.025"]);
  let dist = NaN, brg = NaN;
  if (mode === "geo") { const [la1, lo1, la2, lo2] = [...a, ...b].map(parseFloat); dist = haversine(la1, lo1, la2, lo2); brg = initialBearing(la1, lo1, la2, lo2); }
  else { const [e1, n1, e2, n2] = [...p, ...q].map(parseFloat); dist = Math.hypot(e2 - e1, n2 - n1); brg = ((Math.atan2(e2 - e1, n2 - n1) * 180) / Math.PI + 360) % 360; }
  const quad = (z: number) => { const ns = z > 90 && z < 270 ? "S" : "N", ew = z > 180 ? "W" : "E", ang = z <= 90 ? z : z <= 180 ? 180 - z : z <= 270 ? z - 180 : 360 - z; return `${ns} ${toDms(ang)} ${ew}`; };
  return (
    <div className="space-y-4">
      <Select label="Input type" value={mode} onChange={setMode} options={[{ value: "geo", label: "Latitude / Longitude (great-circle)" }, { value: "grid", label: "Grid Easting / Northing (plane)" }]} />
      {mode === "geo" ? <div className="grid gap-3 sm:grid-cols-4"><Num label="Lat 1" value={a[0]} onChange={(v) => setA([v, a[1]])} /><Num label="Lon 1" value={a[1]} onChange={(v) => setA([a[0], v])} /><Num label="Lat 2" value={b[0]} onChange={(v) => setB([v, b[1]])} /><Num label="Lon 2" value={b[1]} onChange={(v) => setB([b[0], v])} /></div>
        : <div className="grid gap-3 sm:grid-cols-4"><Num label="E 1" value={p[0]} onChange={(v) => setP([v, p[1]])} /><Num label="N 1" value={p[1]} onChange={(v) => setP([p[0], v])} /><Num label="E 2" value={q[0]} onChange={(v) => setQ([v, q[1]])} /><Num label="N 2" value={q[1]} onChange={(v) => setQ([q[0], v])} /></div>}
      {Number.isFinite(dist) ? <div className="grid gap-2 sm:grid-cols-3"><Stat label="Distance" value={`${dist.toFixed(3)} m`} /><Stat label="Whole-circle bearing" value={`${brg.toFixed(5)}° (${toDms(brg)})`} /><Stat label="Quadrant bearing" value={quad(brg)} /></div> : <p className="text-red-600">Enter all four values</p>}
    </div>
  );
}

function ForwardPolar() {
  const [mode, setMode] = useState("grid"), [x, setX] = useState("1000"), [y, setY] = useState("1000"), [brg, setBrg] = useState("45"), [dist, setDist] = useState("100");
  const B = parseFloat(brg), D = parseFloat(dist), X = parseFloat(x), Y = parseFloat(y);
  let res: [number, number] | null = null;
  if ([B, D, X, Y].every(Number.isFinite)) res = mode === "grid" ? [X + D * Math.sin((B * Math.PI) / 180), Y + D * Math.cos((B * Math.PI) / 180)] : (() => { const [la, lo] = destination(X, Y, B, D); return [la, lo] as [number, number]; })();
  return (
    <div className="space-y-4">
      <Select label="System" value={mode} onChange={setMode} options={[{ value: "grid", label: "Grid (Easting / Northing)" }, { value: "geo", label: "Lat / Long (great-circle)" }]} />
      <div className="grid gap-3 sm:grid-cols-4"><Num label={mode === "grid" ? "Easting" : "Latitude"} value={x} onChange={setX} /><Num label={mode === "grid" ? "Northing" : "Longitude"} value={y} onChange={setY} /><Num label="Bearing (°, from north)" value={brg} onChange={setBrg} /><Num label="Distance (m)" value={dist} onChange={setDist} /></div>
      {res ? <div className="grid gap-2 sm:grid-cols-2"><Stat label={mode === "grid" ? "New Easting" : "New Latitude"} value={res[0].toFixed(mode === "grid" ? 3 : 8)} /><Stat label={mode === "grid" ? "New Northing" : "New Longitude"} value={res[1].toFixed(mode === "grid" ? 3 : 8)} /></div> : <p className="text-red-600">Enter all values</p>}
    </div>
  );
}

function AreaFromCoordinates() {
  const [txt, setTxt] = useState("0 0\n100 0\n100 50\n0 50");
  const pts = txt.split("\n").map((l) => l.trim().split(/[\s,;\t]+/).map(parseFloat)).filter((p) => p.length >= 2 && p.every(Number.isFinite)) as number[][];
  let a = 0, per = 0;
  pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; per += Math.hypot(q[0] - p[0], q[1] - p[1]); });
  a = Math.abs(a) / 2;
  return (
    <div className="space-y-4">
      <Field label="Points (Easting Northing — one per line, in metres)"><textarea className="input h-40 font-mono" value={txt} onChange={(e) => setTxt(e.target.value)} /></Field>
      {pts.length >= 3 ? <div className="grid gap-2 sm:grid-cols-3"><Stat label="Area" value={`${fmtNum(a, 12)} m²`} /><Stat label="Hectares / acres" value={`${fmtNum(a / 1e4, 8)} ha / ${fmtNum(a / 4046.8564224, 8)} ac`} /><Stat label="Perimeter" value={`${fmtNum(per, 10)} m`} /><Stat label="Marla / kanal" value={`${fmtNum(a / (272.25 * 0.09290304), 8)} / ${fmtNum(a / (5445 * 0.09290304), 8)}`} /></div> : <p className="text-slate-500">Enter at least 3 points. Use projected (grid) coordinates, not lat/long.</p>}
    </div>
  );
}

function SlopeConverter() {
  const [mode, setMode] = useState("percent"), [v, setV] = useState("10");
  const n = parseFloat(v);
  const pct = mode === "percent" ? n : mode === "degrees" ? Math.tan((n * Math.PI) / 180) * 100 : 100 / n;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2"><Select label="Input" value={mode} onChange={setMode} options={[{ value: "percent", label: "Percent (%)" }, { value: "degrees", label: "Degrees (°)" }, { value: "ratio", label: "Ratio (1 : N)" }]} /><Num label="Value" value={v} onChange={setV} /></div>
      <div className="grid gap-2 sm:grid-cols-3"><Stat label="Percent" value={fmtNum(pct, 8) + " %"} /><Stat label="Degrees" value={fmtNum((Math.atan(pct / 100) * 180) / Math.PI, 8) + " °"} /><Stat label="Ratio" value={pct ? `1 : ${fmtNum(100 / pct, 6)}` : "flat"} /></div>
    </div>
  );
}

export const tools: Record<string, ComponentType> = {
  "coordinate-converter": CoordinateConverter, "dms-decimal": Dms, "bearing-distance": BearingDistance,
  "forward-polar": ForwardPolar, "area-from-coordinates": AreaFromCoordinates, "slope-converter": SlopeConverter,
};
