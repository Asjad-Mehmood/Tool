"use client";
import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { categories, tools, type CategoryId, type Engine } from "@toolhub/registry";
import { categoryMeta, engineMeta } from "@/lib/ui";
import ToolCard from "./ToolCard";

export default function ToolsDirectory({ category, hideCategoryFilter }: { category?: CategoryId; hideCategoryFilter?: boolean }) {
  const [q, setQ] = useState(""), [cat, setCat] = useState<CategoryId | "all">(category ?? "all"), [eng, setEng] = useState<Engine | "all">("all");
  const pool = useMemo(() => tools.filter((t) => (cat === "all" || t.category === cat) && (eng === "all" || t.engine === eng)), [cat, eng]);
  const fuse = useMemo(() => new Fuse(pool, { keys: ["title", "shortDesc", "keywords"], threshold: 0.35 }), [pool]);
  const list = q.trim() ? fuse.search(q).map((r) => r.item) : pool;
  const used = categories.filter((c) => tools.some((t) => t.category === c.id));
  const pill = (active: boolean) => `rounded-full border px-3 py-1 text-xs font-medium transition ${active ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-400"}`;
  return (
    <div className="space-y-5">
      <input className="input max-w-md" placeholder="Filter tools…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter tools" />
      {!hideCategoryFilter && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
          <button className={pill(cat === "all")} onClick={() => setCat("all")}>All</button>
          {used.map((c) => { const I = categoryMeta[c.id].icon; return <button key={c.id} className={`${pill(cat === c.id)} inline-flex items-center gap-1`} onClick={() => setCat(c.id)}><I size={12} />{c.title}</button>; })}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs" role="group" aria-label="Where it runs">
        <span className="text-slate-500">Runs:</span>
        <button className={pill(eng === "all")} onClick={() => setEng("all")}>Anywhere</button>
        {(["instant", "client", "server"] as Engine[]).map((e) => <button key={e} className={pill(eng === e)} onClick={() => setEng(e)} title={engineMeta[e].hint}>{engineMeta[e].label}</button>)}
      </div>
      <p className="text-sm text-slate-500" aria-live="polite">{list.length} tool{list.length === 1 ? "" : "s"}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.map((t) => <ToolCard key={t.slug} tool={t} />)}</div>
      {!list.length && <p className="card text-center text-slate-500">No tools match your filters.</p>}
    </div>
  );
}
