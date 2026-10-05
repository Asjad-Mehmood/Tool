"use client";
import { TextTool } from "@/components/templates";
const words = (s: string) => s.match(/[A-Za-z0-9]+/g) ?? [];
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
const fns: Record<string, (s: string) => string> = {
  upper: (s) => s.toUpperCase(),
  lower: (s) => s.toLowerCase(),
  title: (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
  sentence: (s) => s.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, a, b) => a + b.toUpperCase()),
  camel: (s) => words(s).map((w, i) => (i ? cap(w) : w.toLowerCase())).join(""),
  pascal: (s) => words(s).map(cap).join(""),
  snake: (s) => words(s).map((w) => w.toLowerCase()).join("_"),
  kebab: (s) => words(s).map((w) => w.toLowerCase()).join("-"),
};
const actions = Object.keys(fns).map((id) => ({ id, label: id === "upper" ? "UPPER CASE" : id === "lower" ? "lower case" : id[0].toUpperCase() + id.slice(1) + " case" }));
export default function CaseConverter() {
  return <TextTool actions={actions} transform={(s, a) => fns[a ?? "upper"](s)} />;
}
