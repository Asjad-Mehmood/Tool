"use client";
import { useMemo, useState, useEffect, type ComponentType } from "react";
import Papa from "papaparse";
import { load as yamlLoad, dump as yamlDump } from "js-yaml";
import { md5 } from "js-md5";
import { Field, Num, ResultCard, Select, Stat, TextTool, fmtNum } from "@/components/templates";

const JsonCsv = () => (
  <TextTool
    placeholder="Paste a JSON array or CSV"
    actions={[{ id: "j2c", label: "JSON → CSV" }, { id: "c2j", label: "CSV → JSON" }]}
    transform={(s, a) => !s.trim() ? "" : a === "c2j" ? JSON.stringify(Papa.parse(s, { header: true, skipEmptyLines: true, dynamicTyping: true }).data, null, 2) : Papa.unparse(JSON.parse(s))}
  />
);

const JsonYaml = () => (
  <TextTool
    actions={[{ id: "j2y", label: "JSON → YAML" }, { id: "y2j", label: "YAML → JSON" }]}
    transform={(s, a) => !s.trim() ? "" : a === "y2j" ? JSON.stringify(yamlLoad(s), null, 2) : yamlDump(JSON.parse(s))}
  />
);

const UrlEncode = () => (
  <TextTool
    actions={[{ id: "enc", label: "Encode" }, { id: "encfull", label: "Encode full URL" }, { id: "dec", label: "Decode" }]}
    transform={(s, a) => a === "dec" ? decodeURIComponent(s) : a === "encfull" ? encodeURI(s) : encodeURIComponent(s)}
  />
);

const b64url = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0)));
const JwtDecoder = () => (
  <TextTool
    placeholder="Paste a JWT"
    transform={(s) => {
      if (!s.trim()) return "";
      const [h, p, sig] = s.trim().split(".");
      if (!h || !p) throw new Error("Not a valid JWT");
      const payload = JSON.parse(b64url(p));
      const exp = typeof payload.exp === "number" ? `\n\n// exp: ${new Date(payload.exp * 1000).toISOString()}${payload.exp * 1000 < Date.now() ? " (EXPIRED)" : ""}` : "";
      return `// HEADER\n${JSON.stringify(JSON.parse(b64url(h)), null, 2)}\n\n// PAYLOAD\n${JSON.stringify(payload, null, 2)}${exp}\n\n// SIGNATURE (not verified)\n${sig ?? ""}`;
    }}
  />
);

const RegexTester = () => {
  const [pat, setPat] = useState("(\\w+)@(\\w+\\.com)"), [flags, setFlags] = useState("g"), [text, setText] = useState("alice@example.com, bob@test.com");
  const { matches, err } = useMemo(() => {
    try {
      const re = new RegExp(pat, flags.includes("g") ? flags : flags + "g");
      return { matches: Array.from(text.matchAll(re)).slice(0, 500), err: "" };
    } catch (e) { return { matches: [], err: (e as Error).message }; }
  }, [pat, flags, text]);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
        <Field label="Pattern"><input className="input font-mono" value={pat} onChange={(e) => setPat(e.target.value)} /></Field>
        <Field label="Flags"><input className="input font-mono" value={flags} onChange={(e) => setFlags(e.target.value)} /></Field>
      </div>
      <textarea className="input h-40 font-mono" value={text} onChange={(e) => setText(e.target.value)} />
      {err ? <p className="text-red-600">{err}</p> : <p className="text-sm text-slate-500">{matches.length} match(es)</p>}
      <div className="space-y-1 font-mono text-sm">{matches.map((m, i) => <div key={i} className="card py-1">#{i + 1} @{m.index}: <b>{m[0]}</b>{m.length > 1 && <span className="text-slate-500"> groups: {m.slice(1).map((g) => JSON.stringify(g)).join(", ")}</span>}</div>)}</div>
    </div>
  );
};

const UuidGenerator = () => {
  const [n, setN] = useState("5"), [seed, setSeed] = useState(0);
  const list = useMemo(() => { void seed; return Array.from({ length: Math.min(Math.max(+n || 1, 1), 100) }, () => crypto.randomUUID()); }, [n, seed]);
  return (
    <div className="space-y-3">
      <Num label="How many (1–100)" value={n} onChange={setN} />
      <div className="flex gap-2"><button className="btn" onClick={() => setSeed(seed + 1)}>Regenerate</button><button className="btn-ghost" onClick={() => navigator.clipboard.writeText(list.join("\n"))}>Copy all</button></div>
      <textarea className="input h-56 font-mono" readOnly value={list.join("\n")} />
    </div>
  );
};

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
const HashGenerator = () => {
  const [text, setText] = useState(""), [h, setH] = useState<Record<string, string>>({});
  useEffect(() => {
    let live = true;
    (async () => {
      const data = new TextEncoder().encode(text), r: Record<string, string> = { MD5: md5(text) };
      for (const a of ["SHA-1", "SHA-256", "SHA-512"]) r[a] = hex(await crypto.subtle.digest(a, data));
      if (live) setH(r);
    })();
    return () => { live = false; };
  }, [text]);
  return (
    <div className="space-y-3">
      <textarea className="input h-32" placeholder="Text to hash" value={text} onChange={(e) => setText(e.target.value)} />
      {Object.entries(h).map(([k, v]) => <Stat key={k} label={k} value={<span className="font-mono text-sm">{v}</span>} />)}
    </div>
  );
};

const TimestampConverter = () => {
  const [ts, setTs] = useState(String(Math.floor(Date.now() / 1000))), [date, setDate] = useState(new Date().toISOString());
  const n = Number(ts), ms = Math.abs(n) > 1e11 ? n : n * 1000, d = new Date(ms), ok = ts.trim() !== "" && !isNaN(d.getTime());
  const d2 = new Date(date), ok2 = !isNaN(d2.getTime());
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3"><Num label="Unix timestamp (s or ms)" value={ts} onChange={setTs} />
        <Stat label="UTC" value={ok ? d.toUTCString() : "—"} /><Stat label="ISO 8601" value={ok ? d.toISOString() : "—"} /><Stat label="Local" value={ok ? d.toString() : "—"} /></div>
      <div className="space-y-3"><Field label="Date (ISO or any parseable)"><input className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Stat label="Seconds" value={ok2 ? Math.floor(d2.getTime() / 1000) : "—"} /><Stat label="Milliseconds" value={ok2 ? d2.getTime() : "—"} />
        <button className="btn-ghost" onClick={() => { setTs(String(Math.floor(Date.now() / 1000))); setDate(new Date().toISOString()); }}>Now</button></div>
    </div>
  );
};

type RGB = [number, number, number];
const hexToRgb = (h: string): RGB | null => { const m = h.trim().replace("#", "").match(/^([\da-f]{3}|[\da-f]{6})$/i); if (!m) return null; let x = m[1]; if (x.length === 3) x = [...x].map((c) => c + c).join(""); return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)) as RGB; };
const rgbToHsl = ([r, g, b]: RGB): RGB => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let h = 0, s = 0; if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [Math.round(h), Math.round(s * 100), Math.round(l * 100)]; };
const hslToRgb = ([h, s, l]: RGB): RGB => { s /= 100; l /= 100; const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]; };
const ColorConverter = () => {
  const [hexV, setHexV] = useState("#4f46e5");
  const [rgbV, setRgbV] = useState("79, 70, 229");
  const [hslV, setHslV] = useState("243, 75%, 59%");
  const sync = (rgb: RGB, skip: string) => {
    const h = "#" + rgb.map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0")).join("");
    if (skip !== "hex") setHexV(h); if (skip !== "rgb") setRgbV(rgb.join(", ")); if (skip !== "hsl") { const [a, b, c] = rgbToHsl(rgb); setHslV(`${a}, ${b}%, ${c}%`); }
  };
  const cur = hexToRgb(hexV);
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_160px]">
      <div className="space-y-3">
        <Field label="HEX"><input className="input font-mono" value={hexV} onChange={(e) => { setHexV(e.target.value); const r = hexToRgb(e.target.value); if (r) sync(r, "hex"); }} /></Field>
        <Field label="RGB (r, g, b)"><input className="input font-mono" value={rgbV} onChange={(e) => { setRgbV(e.target.value); const p = e.target.value.split(/[ ,]+/).filter(Boolean).map(Number); if (p.length === 3 && p.every((x) => x >= 0 && x <= 255)) sync(p as RGB, "rgb"); }} /></Field>
        <Field label="HSL (h, s%, l%)"><input className="input font-mono" value={hslV} onChange={(e) => { setHslV(e.target.value); const p = e.target.value.replace(/%/g, "").split(/[ ,]+/).filter(Boolean).map(Number); if (p.length === 3 && p.every((x) => !isNaN(x))) sync(hslToRgb(p as RGB), "hsl"); }} /></Field>
      </div>
      <div className="h-32 rounded-xl border" style={{ background: cur ? hexV : "transparent" }} />
    </div>
  );
};

const NumberBase = () => {
  const [v, setV] = useState("255"), [base, setBase] = useState("10");
  let n: bigint | null = null;
  try { const b = +base, digits = "0123456789abcdefghijklmnopqrstuvwxyz".slice(0, b); const s = v.trim().toLowerCase().replace(/^0[xbo]/, ""); if (s && [...s].every((c) => digits.includes(c))) { n = 0n; for (const c of s) n = n * BigInt(b) + BigInt(digits.indexOf(c)); } } catch { n = null; }
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Value"><input className="input font-mono" value={v} onChange={(e) => setV(e.target.value)} /></Field>
        <Select label="Input base" value={base} onChange={setBase} options={[{ value: "2", label: "Binary (2)" }, { value: "8", label: "Octal (8)" }, { value: "10", label: "Decimal (10)" }, { value: "16", label: "Hex (16)" }]} /></div>
      <div className="grid gap-2 sm:grid-cols-2">{[["Binary", 2], ["Octal", 8], ["Decimal", 10], ["Hexadecimal", 16]].map(([k, b]) => <Stat key={k as string} label={k as string} value={n === null ? "—" : n.toString(b as number).toUpperCase()} />)}</div>
    </div>
  );
};

export const tools: Record<string, ComponentType> = {
  "json-csv": JsonCsv, "json-yaml": JsonYaml, "url-encode": UrlEncode, "jwt-decoder": JwtDecoder, "regex-tester": RegexTester,
  "uuid-generator": UuidGenerator, "hash-generator": HashGenerator, "timestamp-converter": TimestampConverter,
  "color-converter": ColorConverter, "number-base": NumberBase,
};
void ResultCard; void fmtNum;
