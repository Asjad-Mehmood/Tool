import Link from "next/link";
import type { Tool } from "@toolhub/registry";
import { GroupIcon, engineMeta } from "@/lib/ui";

export default function ToolCard({ tool, compact }: { tool: Tool; compact?: boolean }) {
  const e = engineMeta[tool.engine], E = e.icon;
  return (
    <Link href={`/${tool.slug}`} className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md">
      <GroupIcon id={tool.group!} size={compact ? 36 : 42} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold text-slate-900 group-hover:text-indigo-600">{tool.title}</span>
        </span>
        <span className="mt-0.5 line-clamp-2 block text-sm text-slate-500">{tool.shortDesc}</span>
      </span>
      <span title={e.hint} className="mt-1 shrink-0 text-slate-400"><E size={14} aria-label={e.label} /></span>
    </Link>
  );
}
