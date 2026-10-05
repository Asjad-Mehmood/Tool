// Pure constants safe to import from the browser (the server-only SDK lives in lib/ai.ts).
export type AiSlug = "summarize-pdf" | "chat-with-pdf" | "translate-pdf";
export const AI_MAX: Record<AiSlug, number> = { "summarize-pdf": 300_000, "chat-with-pdf": 300_000, "translate-pdf": 60_000 };
export const LANGS = ["Arabic", "Urdu", "English", "French", "German", "Spanish", "Portuguese", "Italian", "Turkish", "Russian", "Hindi", "Bengali", "Indonesian", "Chinese (Simplified)", "Japanese", "Korean", "Dutch", "Persian"];
export function costOf(tool: AiSlug, chars: number): number {
  if (tool === "translate-pdf") return Math.max(1, Math.ceil(chars / 10_000));
  if (tool === "summarize-pdf") return Math.max(1, Math.ceil(chars / 100_000));
  return 1;
}
