import { NextResponse } from "next/server";
import { tools } from "@toolhub/registry";
import { apiAuth } from "@/lib/apiauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/tools — the tools available over the API. */
export async function GET(req: Request) {
  const a = await apiAuth(req);
  if ("res" in a) return a.res;
  return NextResponse.json({ tools: tools.filter((t) => t.engine === "server" && t.ui === "file").map((t) => ({ id: t.slug, name: t.title, description: t.shortDesc, accept: t.accept, multiple: Boolean(t.multiple), maxMB: a.bigFiles ? t.limits?.proMB : t.limits?.freeMB, options: (t.options ?? []).map((o) => ({ key: o.key, label: o.label, type: o.type, default: o.default, choices: o.choices?.map((c) => c.value) })) })) });
}
