"use client";
import { useMemo, useState, type ComponentType } from "react";
import { diffLines, diffWords } from "diff";
import { Field, Select, TextTool } from "@/components/templates";

const RemoveDuplicateLines = () => (
  <TextTool
    actions={[{ id: "keep", label: "Keep first" }, { id: "ci", label: "Ignore case" }, { id: "trim", label: "Ignore spacing" }]}
    transform={(s, a) => { const seen = new Set<string>(); return s.split("\n").filter((l) => { const k = a === "ci" ? l.toLowerCase() : a === "trim" ? l.trim() : l; if (seen.has(k)) return false; seen.add(k); return true; }).join("\n"); }}
  />
);

const SortLines = () => (
  <TextTool
    actions={[{ id: "az", label: "A → Z" }, { id: "za", label: "Z → A" }, { id: "len", label: "By length" }, { id: "num", label: "Numeric" }, { id: "rand", label: "Random" }, { id: "rev", label: "Reverse" }]}
    transform={(s, a) => {
      const l = s.split("\n");
      switch (a) {
        case "za": return l.sort((x, y) => y.localeCompare(x)).join("\n");
        case "len": return l.sort((x, y) => x.length - y.length).join("\n");
        case "num": return l.sort((x, y) => parseFloat(x) - parseFloat(y)).join("\n");
        case "rand": for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l.join("\n");
        case "rev": return l.reverse().join("\n");
        default: return l.sort((x, y) => x.localeCompare(y)).join("\n");
      }
    }}
  />
);

const RemoveExtraSpaces = () => (
  <TextTool
    actions={[{ id: "spaces", label: "Extra spaces" }, { id: "blank", label: "Blank lines" }, { id: "breaks", label: "All line breaks" }, { id: "trim", label: "Trim each line" }]}
    transform={(s, a) => a === "blank" ? s.replace(/\n\s*\n+/g, "\n") : a === "breaks" ? s.replace(/\s*\n\s*/g, " ").trim() : a === "trim" ? s.split("\n").map((l) => l.trim()).join("\n") : s.replace(/[ \t]{2,}/g, " ")}
  />
);

const TextDiff = () => {
  const [a, setA] = useState(""), [b, setB] = useState(""), [mode, setMode] = useState("lines");
  const parts = useMemo(() => (mode === "lines" ? diffLines(a, b) : diffWords(a, b)), [a, b, mode]);
  return (
    <div className="space-y-3">
      <Select label="Compare by" value={mode} onChange={setMode} options={[{ value: "lines", label: "Lines" }, { value: "words", label: "Words" }]} />
      <div className="grid gap-3 md:grid-cols-2">
        <textarea className="input h-48 font-mono" placeholder="Original" value={a} onChange={(e) => setA(e.target.value)} />
        <textarea className="input h-48 font-mono" placeholder="Changed" value={b} onChange={(e) => setB(e.target.value)} />
      </div>
      <pre className="card whitespace-pre-wrap text-sm">
        {parts.map((p, i) => <span key={i} className={p.added ? "bg-emerald-200" : p.removed ? "bg-red-200 line-through" : ""}>{p.value}</span>)}
      </pre>
    </div>
  );
};

const FindReplace = () => {
  const [text, setText] = useState(""), [find, setFind] = useState(""), [rep, setRep] = useState("");
  const [rx, setRx] = useState(false), [ci, setCi] = useState(false);
  let out = text, err = "", count = 0;
  if (find) {
    try {
      const re = new RegExp(rx ? find : find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g" + (ci ? "i" : ""));
      count = (text.match(re) ?? []).length; out = text.replace(re, rep);
    } catch (e) { err = (e as Error).message; }
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Find"><input className="input" value={find} onChange={(e) => setFind(e.target.value)} /></Field>
        <Field label="Replace with"><input className="input" value={rep} onChange={(e) => setRep(e.target.value)} /></Field>
      </div>
      <div className="flex gap-4 text-sm">
        <label className="flex gap-1"><input type="checkbox" checked={rx} onChange={(e) => setRx(e.target.checked)} />Regex</label>
        <label className="flex gap-1"><input type="checkbox" checked={ci} onChange={(e) => setCi(e.target.checked)} />Ignore case</label>
        <span className="text-slate-500">{err || `${count} match(es)`}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <textarea className="input h-56 font-mono" placeholder="Text" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="relative"><textarea className="input h-56 font-mono" readOnly value={out} /><button className="btn-ghost absolute right-2 top-2" onClick={() => navigator.clipboard.writeText(out)}>Copy</button></div>
      </div>
    </div>
  );
};

const WORDS = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(" ");
const LoremIpsum = () => {
  const [n, setN] = useState(3), [seed, setSeed] = useState(0);
  const out = useMemo(() => {
    void seed;
    const sent = () => { const len = 8 + Math.floor(Math.random() * 10); const w = Array.from({ length: len }, () => WORDS[Math.floor(Math.random() * WORDS.length)]); return w[0][0].toUpperCase() + w[0].slice(1) + " " + w.slice(1).join(" ") + "."; };
    return Array.from({ length: n }, (_, i) => (i === 0 ? "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " : "") + Array.from({ length: 4 + Math.floor(Math.random() * 3) }, sent).join(" ")).join("\n\n");
  }, [n, seed]);
  return (
    <div className="space-y-3">
      <Field label={`Paragraphs: ${n}`}><input type="range" min={1} max={20} value={n} onChange={(e) => setN(+e.target.value)} className="w-full" /></Field>
      <button className="btn" onClick={() => setSeed(seed + 1)}>Regenerate</button>
      <textarea className="input h-64" readOnly value={out} />
    </div>
  );
};

export const tools: Record<string, ComponentType> = {
  "remove-duplicate-lines": RemoveDuplicateLines, "sort-lines": SortLines, "remove-extra-spaces": RemoveExtraSpaces,
  "text-diff": TextDiff, "find-replace": FindReplace, "lorem-ipsum": LoremIpsum,
};
