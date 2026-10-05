"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { components } from "@/processors";

const cache: Record<string, ComponentType> = {};
export default function ToolRunner({ slug }: { slug: string }) {
  const loader = components[slug];
  if (!loader) return <p className="text-slate-500">This tool is coming soon.</p>;
  const Comp = (cache[slug] ??= dynamic(loader, { ssr: false, loading: () => <p>Loading…</p> }));
  return <Comp />;
}
