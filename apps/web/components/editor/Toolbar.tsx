"use client";
import { Circle, CheckSquare, Eraser, EyeOff, Highlighter, ImagePlus, Link2, Minus, MousePointer2, MoveUpRight, Pencil, PenTool, Square, StickyNote, Stamp, Strikethrough, TextCursorInput, Type, Underline, TextSelect } from "lucide-react";
import type { ToolId } from "./types";

export const TOOLS: { id: ToolId; label: string; key: string; icon: React.ComponentType<{ size?: number }>; group: string }[] = [
  { id: "select", label: "Select", key: "V", icon: MousePointer2, group: "Basics" },
  { id: "text", label: "Add text", key: "T", icon: Type, group: "Basics" },
  { id: "edit", label: "Edit existing text", key: "E", icon: TextSelect, group: "Basics" },
  { id: "highlight", label: "Highlight", key: "H", icon: Highlighter, group: "Mark up" },
  { id: "underline", label: "Underline", key: "U", icon: Underline, group: "Mark up" },
  { id: "strike", label: "Strikethrough", key: "K", icon: Strikethrough, group: "Mark up" },
  { id: "pen", label: "Pen", key: "P", icon: Pencil, group: "Draw" },
  { id: "rect", label: "Rectangle", key: "R", icon: Square, group: "Draw" },
  { id: "ellipse", label: "Ellipse", key: "O", icon: Circle, group: "Draw" },
  { id: "line", label: "Line", key: "L", icon: Minus, group: "Draw" },
  { id: "arrow", label: "Arrow", key: "A", icon: MoveUpRight, group: "Draw" },
  { id: "image", label: "Image", key: "I", icon: ImagePlus, group: "Insert" },
  { id: "signature", label: "Signature", key: "G", icon: PenTool, group: "Insert" },
  { id: "stamp", label: "Stamp", key: "S", icon: Stamp, group: "Insert" },
  { id: "note", label: "Comment note", key: "N", icon: StickyNote, group: "Insert" },
  { id: "link", label: "Link", key: "J", icon: Link2, group: "Insert" },
  { id: "cover", label: "White-out", key: "W", icon: Eraser, group: "Cover" },
  { id: "redact", label: "Redact (permanent)", key: "X", icon: EyeOff, group: "Cover" },
  { id: "field-text", label: "Text field", key: "F", icon: TextCursorInput, group: "Form" },
  { id: "field-check", label: "Checkbox", key: "C", icon: CheckSquare, group: "Form" },
];

export default function Toolbar({ tool, setTool }: { tool: ToolId; setTool: (t: ToolId) => void }) {
  const groups = [...new Set(TOOLS.map((t) => t.group))];
  return (
    <div role="toolbar" aria-label="Editing tools" className="flex items-stretch gap-3 overflow-x-auto border-b border-slate-200 bg-white px-2 py-1.5">
      {groups.map((g) => (
        <div key={g} className="flex shrink-0 flex-col items-center">
          <div className="flex gap-0.5">
            {TOOLS.filter((t) => t.group === g).map((t) => { const I = t.icon, on = tool === t.id; return (
              <button key={t.id} type="button" title={`${t.label} (${t.key})`} aria-label={t.label} aria-pressed={on} onClick={() => setTool(t.id)} className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${on ? "bg-indigo-600 text-white shadow" : "text-slate-700 hover:bg-slate-100"}`}><I size={17} /></button>
            ); })}
          </div>
          <span className="text-[9px] uppercase tracking-wide text-slate-400">{g}</span>
        </div>
      ))}
    </div>
  );
}
