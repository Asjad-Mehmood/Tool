export type Engine = "instant" | "client" | "server" | "ai";
export type PdfGroup = "organize" | "optimize" | "to-pdf" | "from-pdf" | "edit" | "secure" | "ai";
export type UIKind = "file" | "text" | "form" | "editor";
export type CategoryId = "pdf" | "image" | "video" | "audio" | "text" | "dev" | "security" | "network" | "converter" | "calculator" | "generator" | "archive" | "data";

export interface ToolOption {
  key: string;
  label: string;
  type: "select" | "number" | "text" | "toggle" | "range";
  default: unknown;
  choices?: { value: string; label: string }[];
}

export interface Tool {
  slug: string;
  category: CategoryId;
  title: string;
  shortDesc: string;
  engine: Engine;
  ui: UIKind;
  accept?: string[];
  multiple?: boolean;
  limits?: { freeMB: number; proMB: number };
  options?: ToolOption[];
  related?: string[];
  keywords?: string[];
  priority: 1 | 2 | 3;
  /** PDF task group — only set for tools shown on the site. */
  group?: PdfGroup;
  /** Hidden tools stay in code but have no page, search entry or sitemap entry. */
  hidden?: boolean;
  /** Needs a signed-in account. */
  login?: boolean;
  /** AI credits charged per run (engine "ai"). */
  credits?: number;
  premium?: boolean;
  isNew?: boolean;
}

export interface Group { id: PdfGroup; title: string; desc: string }
export interface Category { id: CategoryId; title: string; icon: string; desc: string }
