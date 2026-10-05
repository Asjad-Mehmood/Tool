"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { categories, tools } from "@toolhub/registry";

export default function Home() {
  const [q, setQ] = useState("");
  const fuse = useMemo(() => new Fuse(tools, { keys: ["title", "shortDesc", "keywords"], threshold: 0.35 }), []);
  const results = q.trim() ? fuse.search(q).map((r) => r.item) : null;
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">All your online tools in one place</h1>
      <p className="mb-6 text-slate-600">Fast, free and private. Most tools never upload your files.</p>
      <input className="input mb-8 max-w-xl" placeholder="Search tools…" value={q} onChange={(e) => setQ(e.target.value)} />
      {results ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((t) => <ToolCard key={t.slug} slug={t.slug} title={t.title} desc={t.shortDesc} />)}
          {results.length === 0 && <p className="text-slate-500">No tools found.</p>}
        </div>
      ) : (
        categories.map((c) => {
          const list = tools.filter((t) => t.category === c.id);
          if (!list.length) return null;
          return (
            <section key={c.id} className="mb-8">
              <h2 className="mb-3 text-xl font-semibold">{c.icon} {c.title}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((t) => <ToolCard key={t.slug} slug={t.slug} title={t.title} desc={t.shortDesc} />)}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function ToolCard({ slug, title, desc }: { slug: string; title: string; desc: string }) {
  return (
    <Link href={`/${slug}`} className="card block transition hover:border-indigo-400">
      <div className="font-medium">{title}</div>
      <div className="text-sm text-slate-500">{desc}</div>
    </Link>
  );
}
