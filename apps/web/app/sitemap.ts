import type { MetadataRoute } from "next";
import { groups, tools } from "@toolhub/registry";
import { posts } from "@/lib/blog";
import { SITE_URL as base } from "@/lib/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...["", "/tools", "/pricing", "/about", "/privacy", "/terms", "/blog", "/docs/api"].map((p) => ({ url: base + p, priority: p === "" ? 1 : 0.5 })),
    ...groups.map((g) => ({ url: `${base}/category/${g.id}`, priority: 0.7 })),
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, priority: 0.6 })),
    ...tools.map((t) => ({ url: `${base}/${t.slug}`, priority: t.priority === 1 ? 0.9 : 0.6 })),
  ];
}
