"use client";
import { TextTool } from "@/components/templates";
export default function JsonFormatter() {
  return (
    <TextTool
      actions={[{ id: "format", label: "Format" }, { id: "minify", label: "Minify" }]}
      transform={(s, a) => { if (!s.trim()) return ""; const v = JSON.parse(s); return a === "minify" ? JSON.stringify(v) : JSON.stringify(v, null, 2); }}
    />
  );
}
