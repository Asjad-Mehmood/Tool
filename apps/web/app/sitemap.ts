import type { MetadataRoute } from "next";
import { tools } from "@toolhub/registry";
const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toolhub.example";
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: base }, ...tools.map((t) => ({ url: `${base}/${t.slug}` }))];
}
