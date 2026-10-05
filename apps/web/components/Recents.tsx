"use client";
import { useEffect, useState } from "react";
import { getTool, type Tool } from "@toolhub/registry";
import ToolCard from "./ToolCard";

const KEY = "toolhub:recent";
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };

/** Remembers the tool being viewed (per-browser only; nothing is sent anywhere). */
export function RecordVisit({ slug }: { slug: string }) {
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify([slug, ...read().filter((s) => s !== slug)].slice(0, 8))); } catch { /* storage blocked */ } }, [slug]);
  return null;
}

export function RecentTools() {
  const [list, setList] = useState<Tool[]>([]);
  useEffect(() => setList(read().map(getTool).filter((t): t is Tool => !!t).slice(0, 4)), []);
  if (!list.length) return null;
  return (
    <section className="fade-in">
      <h2 className="section-title mb-4">Recently used</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{list.map((t) => <ToolCard key={t.slug} tool={t} compact />)}</div>
    </section>
  );
}
