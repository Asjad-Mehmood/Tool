import type { MetadataRoute } from "next";
import { categories, tools } from "@toolhub/registry";
const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toolhub.example";
export default function sitemap(): MetadataRoute.Sitemap {
  const cats = categories.filter((c) => tools.some((t) => t.category === c.id));
  return [
    ...["", "/tools", "/pricing", "/about", "/privacy", "/terms"].map((p) => ({ url: base + p, priority: p === "" ? 1 : 0.5 })),
    ...cats.map((c) => ({ url: `${base}/category/${c.id}`, priority: 0.7 })),
    ...tools.map((t) => ({ url: `${base}/${t.slug}`, priority: t.priority === 1 ? 0.9 : 0.6 })),
  ];
}
