// Generates extension/tools.json from the registry so the popup never drifts from the site.
// Usage: SITE_URL=https://your-site npx tsx scripts/build-extension.ts
import { writeFileSync } from "node:fs";
import { groups, tools } from "../packages/registry/src/index";

const site = (process.env.SITE_URL ?? "https://toolhub.example").replace(/\/$/, "");
const data = { site, groups: groups.map((g) => ({ id: g.id, title: g.title, tools: tools.filter((t) => t.group === g.id).map((t) => ({ slug: t.slug, title: t.title, desc: t.shortDesc })) })) };
writeFileSync(new URL("../extension/tools.json", import.meta.url), JSON.stringify(data, null, 2) + "\n");
console.log(`extension/tools.json written (${tools.length} tools, site ${site})`);
