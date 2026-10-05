export type Engine = "instant" | "client" | "server" | "ai";
export type UIKind = "file" | "text" | "form" | "editor";
export type CategoryId = "pdf" | "image" | "text" | "dev" | "security" | "converter" | "calculator" | "survey" | "generator";

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
  premium?: boolean;
  isNew?: boolean;
}

export interface Category { id: CategoryId; title: string; icon: string; desc: string }
