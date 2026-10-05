import { tools } from "./tools";
export * from "./types";
export { categories } from "./categories";
export { tools };
export const getTool = (slug: string) => tools.find((t) => t.slug === slug);
export const toolsByCategory = (id: string) => tools.filter((t) => t.category === id);
