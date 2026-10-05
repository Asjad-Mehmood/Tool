import { catalogue } from "./tools";
import { pdfExtra } from "./tools/pdf-extra";
import type { PdfGroup, Tool } from "./types";

import { groups as allGroups } from "./groups";

export * from "./types";
export { categories } from "./categories";

/** Static builds (GitHub Pages) can only host tools that run in the browser. */
const STATIC_SITE = process.env.NEXT_PUBLIC_STATIC_SITE === "1";

/** The site is PDF-focused: only these tools are listed. Everything else in the catalogue stays in code but is hidden. */
const GROUP_OF: Record<string, PdfGroup> = {
  "pdf-editor": "edit",
  "merge-pdf": "organize", "split-pdf": "organize", "rotate-pdf": "organize", "delete-pdf-pages": "organize", "extract-pdf-pages": "organize", "organize-pdf": "organize",
  "compress-pdf": "optimize", "repair-pdf": "optimize", "ocr-pdf": "optimize", "grayscale-pdf": "optimize",
  "word-to-pdf": "to-pdf", "excel-to-pdf": "to-pdf", "powerpoint-to-pdf": "to-pdf", "jpg-to-pdf": "to-pdf", "text-to-pdf": "to-pdf",
  "pdf-to-jpg": "from-pdf", "pdf-to-text": "from-pdf",
  "pdf-watermark": "edit", "pdf-page-numbers": "edit", "crop-pdf": "edit", "sign-pdf": "edit", "edit-pdf-metadata": "edit", "flatten-pdf": "edit", "compare-pdf": "edit",
  "protect-pdf": "secure", "unlock-pdf": "secure", "redact-pdf": "secure",
  "summarize-pdf": "ai", "chat-with-pdf": "ai", "translate-pdf": "ai",
};

/** Explicit order inside each group (groups render in this order too). */
const ORDER = Object.keys(GROUP_OF);
export const allTools: Tool[] = [...catalogue, ...pdfExtra].map((t) => (GROUP_OF[t.slug] ? { ...t, group: GROUP_OF[t.slug] } : { ...t, hidden: true }));
export const tools: Tool[] = allTools.filter((t) => !t.hidden && (!STATIC_SITE || t.engine === "client" || t.engine === "instant")).sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug));
export const getTool = (slug: string) => tools.find((t) => t.slug === slug);
export const toolsByGroup = (id: PdfGroup) => tools.filter((t) => t.group === id);
export const groups = allGroups.filter((g) => tools.some((t) => t.group === g.id));
