import { Archive, Calculator, Code2, Cloud, Compass, FileText, Globe, Headphones, Image as ImageIcon, Monitor, QrCode, Ruler, ShieldCheck, Table2, Type, Video, Zap, type LucideIcon } from "lucide-react";
import type { CategoryId, Engine } from "@toolhub/registry";

export const categoryMeta: Record<CategoryId, { icon: LucideIcon; color: string }> = {
  pdf: { icon: FileText, color: "#ef4444" }, image: { icon: ImageIcon, color: "#ec4899" }, video: { icon: Video, color: "#8b5cf6" },
  audio: { icon: Headphones, color: "#f97316" }, text: { icon: Type, color: "#0ea5e9" }, dev: { icon: Code2, color: "#6366f1" },
  security: { icon: ShieldCheck, color: "#10b981" }, network: { icon: Globe, color: "#06b6d4" }, converter: { icon: Ruler, color: "#f59e0b" },
  calculator: { icon: Calculator, color: "#14b8a6" }, survey: { icon: Compass, color: "#3b82f6" }, generator: { icon: QrCode, color: "#d946ef" },
  archive: { icon: Archive, color: "#78716c" }, data: { icon: Table2, color: "#22c55e" },
};

export const engineMeta: Record<Engine, { label: string; icon: LucideIcon; hint: string }> = {
  instant: { label: "Instant", icon: Zap, hint: "Runs instantly in your browser" },
  client: { label: "In browser", icon: Monitor, hint: "Your files never leave your device" },
  server: { label: "Server", icon: Cloud, hint: "Processed on our servers, deleted within 1 hour" },
  ai: { label: "AI", icon: Zap, hint: "Uses AI credits" },
};

export function CategoryIcon({ id, size = 40 }: { id: CategoryId; size?: number }) {
  const { icon: Icon, color } = categoryMeta[id];
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-xl" style={{ width: size, height: size, background: `${color}1f`, color }}>
      <Icon size={size * 0.52} strokeWidth={2} aria-hidden />
    </span>
  );
}
