import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTool, tools } from "@toolhub/registry";
import ToolRunner from "@/components/ToolRunner";

export const dynamicParams = false;
export function generateStaticParams() { return tools.map((t) => ({ tool: t.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const t = getTool((await params).tool);
  return t ? { title: t.title, description: t.shortDesc } : {};
}

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const tool = getTool((await params).tool);
  if (!tool) notFound();
  const local = tool.engine === "instant" || tool.engine === "client";
  const related = (tool.related ?? []).map(getTool).filter((t) => !!t);
  const jsonLd = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: tool.title, description: tool.shortDesc, applicationCategory: "UtilitiesApplication", operatingSystem: "Any", offers: { "@type": "Offer", price: 0, priceCurrency: "USD" } };
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="mb-4 text-sm text-slate-500"><Link href="/">Home</Link> / {tool.title}</nav>
      <h1 className="text-3xl font-bold">{tool.title}</h1>
      <p className="mb-2 text-slate-600">{tool.shortDesc}</p>
      {local && <p className="mb-6 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-800">🔒 Processed in your browser — nothing is uploaded</p>}
      <div className="card mt-4"><ToolRunner slug={tool.slug} /></div>
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 font-semibold">Related tools</h2>
          <div className="flex flex-wrap gap-2">{related.map((r) => <Link key={r!.slug} className="btn-ghost" href={`/${r!.slug}`}>{r!.title}</Link>)}</div>
        </section>
      )}
    </div>
  );
}
