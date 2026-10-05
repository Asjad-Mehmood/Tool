import type { CategoryId, Engine, Tool, UIKind } from "../types";

type Extra = Partial<Omit<Tool, "slug" | "category" | "title" | "shortDesc" | "engine">>;
export const mk = (category: CategoryId, engine: Engine, ui: UIKind, priority: 1 | 2 | 3) =>
  (slug: string, title: string, shortDesc: string, extra: Extra = {}): Tool =>
    ({ slug, category, title, shortDesc, engine, ui, priority, ...extra });
