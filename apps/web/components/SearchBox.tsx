"use client";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { tools } from "@toolhub/registry";
import { GroupIcon } from "@/lib/ui";

export default function SearchBox({ large, autoFocus }: { large?: boolean; autoFocus?: boolean }) {
  const [q, setQ] = useState(""), [open, setOpen] = useState(false), [idx, setIdx] = useState(0);
  const ref = useRef<HTMLInputElement>(null), box = useRef<HTMLDivElement>(null), router = useRouter();
  const fuse = useMemo(() => new Fuse(tools, { keys: [{ name: "title", weight: 3 }, { name: "keywords", weight: 2 }, "shortDesc", "slug"], threshold: 0.35 }), []);
  const results = q.trim() ? fuse.search(q).slice(0, 7).map((r) => r.item) : [];
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) { e.preventDefault(); ref.current?.focus(); } };
    const click = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", key); window.addEventListener("click", click);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("click", click); };
  }, []);
  const go = (slug: string) => { setOpen(false); setQ(""); router.push(`/${slug}`); };
  return (
    <div ref={box} className="relative w-full">
      <Search size={large ? 20 : 16} className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${large ? "left-4" : "left-3"}`} />
      <input ref={ref} autoFocus={autoFocus} role="combobox" aria-expanded={open} aria-controls="search-results" aria-label="Search tools"
        className={`input ${large ? "!rounded-2xl !py-4 !pl-12 !text-base !shadow-lg" : "!pl-9"}`}
        placeholder={large ? "Search PDF tools — try “merge”, “compress” or “sign”…" : "Search tools…  ( / )"}
        value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); setIdx(0); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
          else if (e.key === "Enter" && results[idx]) go(results[idx].slug);
          else if (e.key === "Escape") setOpen(false);
        }} />
      {open && q.trim() && (
        <div id="search-results" role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {results.length ? results.map((t, i) => (
            <Link key={t.slug} href={`/${t.slug}`} role="option" aria-selected={i === idx} onClick={() => { setOpen(false); setQ(""); }} onMouseEnter={() => setIdx(i)}
              className={`flex items-center gap-3 px-3 py-2.5 ${i === idx ? "bg-indigo-50" : ""}`}>
              <GroupIcon id={t.group!} size={32} />
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{t.title}</span><span className="block truncate text-xs text-slate-500">{t.shortDesc}</span></span>
            </Link>
          )) : <p className="px-4 py-3 text-sm text-slate-500">No tools match “{q}”.</p>}
        </div>
      )}
    </div>
  );
}
