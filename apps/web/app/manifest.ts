import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ToolHub PDF", short_name: "ToolHub", description: "Free online PDF tools — most run privately in your browser.",
    start_url: "/?source=pwa", scope: "/", display: "standalone", background_color: "#0b1020", theme_color: "#e11d48", categories: ["productivity", "utilities"],
    icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }, { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }],
    shortcuts: [{ name: "Merge PDF", url: "/merge-pdf" }, { name: "Compress PDF", url: "/compress-pdf" }, { name: "Sign PDF", url: "/sign-pdf" }],
  };
}
