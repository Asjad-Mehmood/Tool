import { ArrowLeftRight, Cloud, Combine, FileInput, FileOutput, FileText, Minimize2, Monitor, PenLine, ShieldCheck, Sparkles, Zap, type LucideIcon } from "lucide-react";
import type { Engine, PdfGroup } from "@toolhub/registry";

export const groupMeta: Record<PdfGroup, { icon: LucideIcon; color: string }> = {
  organize: { icon: Combine, color: "#ef4444" },
  optimize: { icon: Minimize2, color: "#f97316" },
  "to-pdf": { icon: FileInput, color: "#0ea5e9" },
  "from-pdf": { icon: FileOutput, color: "#10b981" },
  edit: { icon: PenLine, color: "#8b5cf6" },
  secure: { icon: ShieldCheck, color: "#6366f1" },
  ai: { icon: Sparkles, color: "#d946ef" },
};

export const engineMeta: Record<Engine, { label: string; icon: LucideIcon; hint: string }> = {
  instant: { label: "Instant", icon: Zap, hint: "Runs instantly in your browser" },
  client: { label: "In browser", icon: Monitor, hint: "Your files never leave your device" },
  server: { label: "Server", icon: Cloud, hint: "Processed on our servers, deleted within 1 hour" },
  ai: { label: "AI", icon: Sparkles, hint: "Uses AI credits — only the extracted text is sent" },
};

export function GroupIcon({ id, size = 40 }: { id: PdfGroup; size?: number }) {
  const { icon: Icon, color } = groupMeta[id];
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-xl" style={{ width: size, height: size, background: `${color}1f`, color }}>
      <Icon size={size * 0.52} strokeWidth={2} aria-hidden />
    </span>
  );
}
void ArrowLeftRight; void FileText;
