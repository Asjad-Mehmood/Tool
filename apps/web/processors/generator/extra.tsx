"use client";
import { useEffect, useState, type ComponentType } from "react";
import QRCode from "qrcode";
import { Field, Num, ResultCard, Select } from "@/components/templates";

function Qr() {
  const [kind, setKind] = useState("text"), [a, setA] = useState("https://example.com"), [b, setB] = useState(""), [c, setC] = useState("WPA"), [size, setSize] = useState(256), [png, setPng] = useState("");
  const esc = (s: string) => s.replace(/([\;,:"])/g, "\\$1");
  const data = kind === "wifi" ? `WIFI:T:${c};S:${esc(a)};P:${esc(b)};;` : kind === "whatsapp" ? `https://wa.me/${a.replace(/\D/g, "")}${b ? `?text=${encodeURIComponent(b)}` : ""}` : kind === "email" ? `mailto:${a}${b ? `?subject=${encodeURIComponent(b)}` : ""}` : kind === "vcard" ? `BEGIN:VCARD\nVERSION:3.0\nFN:${a}\nTEL:${b}\nEND:VCARD` : a;
  useEffect(() => { if (data) QRCode.toDataURL(data, { width: size, margin: 2 }).then(setPng).catch(() => setPng("")); else setPng(""); }, [data, size]);
  const labels: Record<string, [string, string]> = { text: ["Text or URL", ""], wifi: ["Network name (SSID)", "Password"], whatsapp: ["Phone (with country code)", "Message (optional)"], email: ["Email address", "Subject (optional)"], vcard: ["Full name", "Phone"] };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <Select label="Type" value={kind} onChange={setKind} options={Object.keys(labels)} />
        <Field label={labels[kind][0]}><textarea className="input h-20" value={a} onChange={(e) => setA(e.target.value)} /></Field>
        {labels[kind][1] && <Field label={labels[kind][1]}><input className="input" value={b} onChange={(e) => setB(e.target.value)} /></Field>}
        {kind === "wifi" && <Select label="Security" value={c} onChange={setC} options={["WPA", "WEP", "nopass"]} />}
        <Field label={`Size: ${size}px`}><input type="range" min={128} max={1024} step={32} value={size} onChange={(e) => setSize(+e.target.value)} className="w-full" /></Field>
      </div>
      <div className="flex flex-col items-center gap-3">{png && <><img src={png} alt="QR code" width={Math.min(size, 320)} /><a className="btn" href={png} download="qr.png">Download PNG</a></>}</div>
    </div>
  );
}

function RandomPicker() {
  const [mode, setMode] = useState("number"), [min, setMin] = useState("1"), [max, setMax] = useState("100"), [names, setNames] = useState("Alice\nBob\nCarol"), [count, setCount] = useState("1"), [res, setRes] = useState<string[]>([]);
  const rnd = (n: number) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return Math.floor((a[0] / 2 ** 32) * n); };
  const pick = () => {
    const k = Math.max(1, parseInt(count) || 1);
    if (mode === "number") { const lo = Math.ceil(+min), hi = Math.floor(+max); if (!(hi >= lo)) return setRes(["Invalid range"]); setRes(Array.from({ length: Math.min(k, 1000) }, () => String(lo + rnd(hi - lo + 1)))); }
    else { const pool = names.split("\n").map((s) => s.trim()).filter(Boolean); for (let i = pool.length - 1; i > 0; i--) { const j = rnd(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; } setRes(pool.slice(0, k)); }
  };
  return (
    <div className="space-y-4">
      <Select label="Pick" value={mode} onChange={setMode} options={[{ value: "number", label: "Random numbers" }, { value: "name", label: "Names from a list (no repeats)" }]} />
      {mode === "number" ? <div className="grid gap-3 sm:grid-cols-3"><Num label="Min" value={min} onChange={setMin} /><Num label="Max" value={max} onChange={setMax} /><Num label="How many" value={count} onChange={setCount} /></div>
        : <><Field label="Names (one per line)"><textarea className="input h-32" value={names} onChange={(e) => setNames(e.target.value)} /></Field><Num label="How many" value={count} onChange={setCount} /></>}
      <button className="btn" onClick={pick}>Pick</button>
      {res.length > 0 && <ResultCard>{res.join(", ")}</ResultCard>}
    </div>
  );
}
export const tools: Record<string, ComponentType> = { "qr-code-generator": Qr, "random-picker": RandomPicker };
