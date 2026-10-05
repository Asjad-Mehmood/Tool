"use client";
import { useState } from "react";
export default function WordCounter() {
  const [t, setT] = useState("");
  const words = t.trim() ? t.trim().split(/\s+/).length : 0;
  const sentences = (t.match(/[^.!?]+[.!?]+/g) ?? []).length;
  const stats: [string, string | number][] = [["Words", words], ["Characters", t.length], ["No spaces", t.replace(/\s/g, "").length], ["Sentences", sentences], ["Paragraphs", t.split(/\n\s*\n/).filter((p) => p.trim()).length], ["Reading time", `${Math.max(words ? 1 : 0, Math.ceil(words / 200))} min`]];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">{stats.map(([k, v]) => <div key={k} className="card py-2 text-center"><div className="text-xl font-bold">{v}</div><div className="text-xs text-slate-500">{k}</div></div>)}</div>
      <textarea className="input h-64" placeholder="Type or paste text…" value={t} onChange={(e) => setT(e.target.value)} />
    </div>
  );
}
