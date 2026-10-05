import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, getTool, tools, type Tool } from "@toolhub/registry";
import ToolRunner from "@/components/ToolRunner";
import ToolCard from "@/components/ToolCard";
import { RecordVisit } from "@/components/Recents";
import { CategoryIcon, engineMeta } from "@/lib/ui";
import { faqs, howTo } from "@/lib/content";

export const dynamicParams = false;
export const generateStaticParams = () => tools.map((t) => ({ tool: t.slug }));
export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const t = getTool((await params).tool);
  return t ? { title: `${t.title} — Free Online Tool`, description: `${t.shortDesc}. Free, fast and ${t.engine === "server" ? "secure" : "private — runs in your browser"}.`, alternates: { canonical: `/${t.slug}` } } : {};
}

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const tool = getTool((await params).tool);
  if (!tool) notFound();
  const cat = categories.find((c) => c.id === tool.category)!, e = engineMeta[tool.engine], E = e.icon;
  const related = [...(tool.related ?? []).map(getTool).filter((t): t is Tool => !!t), ...tools.filter((t) => t.category === tool.category && t.slug !== tool.slug)]
    .filter((t, i, a) => a.findIndex((x) => x.slug === t.slug) === i).slice(0, 6);
  const questions = faqs(tool), steps = howTo(tool);
  const ld = [
    { "@context": "https://schema.org", "@type": "SoftwareApplication", name: tool.title, description: tool.shortDesc, applicationCategory: "UtilitiesApplication", operatingSystem: "Any", offers: { "@type": "Offer", price: 0, priceCurrency: "USD" } },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: questions.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    { "@context": "https://schema.org", "@type": "HowTo", name: `How to use ${tool.title}`, step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s })) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["Home", "/"], [cat.title, `/category/${cat.id}`], [tool.title, `/${tool.slug}`]].map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: u })) },
  ];
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <RecordVisit slug={tool.slug} />
      <div className="min-w-0">
        <nav className="mb-4 text-sm text-slate-500" aria-label="Breadcrumb"><Link href="/" className="hover:underline">Home</Link> / <Link href={`/category/${cat.id}`} className="hover:underline">{cat.title}</Link> / <span className="text-slate-700">{tool.title}</span></nav>
        <div className="mb-5 flex items-start gap-4">
          <CategoryIcon id={tool.category} size={56} />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{tool.title}</h1>
            <p className="mt-1 text-slate-600">{tool.shortDesc}</p>
            <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tool.engine === "server" ? "bg-amber-50 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}><E size={13} /> {tool.engine === "server" ? "Processed securely on our servers · auto-deleted in 1 hour" : "Processed in your browser — nothing is uploaded"}</p>
          </div>
        </div>
        <div className="card !p-5 sm:!p-6"><ToolRunner slug={tool.slug} /></div>

        <div className="prose-tool">
          <h2>How to use {tool.title}</h2>
          <ol className="space-y-3">{steps.map((s, i) => <li key={i} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">{i + 1}</span><span className="text-slate-600">{s}</span></li>)}</ol>
          <h2>Frequently asked questions</h2>
          <div className="space-y-2">{questions.map((f) => <details key={f.q} className="card group !p-0"><summary className="cursor-pointer list-none px-4 py-3 font-medium marker:hidden">{f.q}</summary><p className="px-4 pb-4">{f.a}</p></details>)}</div>
        </div>
      </div>
      <aside className="space-y-3 lg:pt-12" aria-label="Related tools">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Related tools</h2>
        {related.map((t) => <ToolCard key={t.slug} tool={t} compact />)}
        <Link href="/tools" className="block pt-1 text-sm font-medium text-indigo-600 hover:underline">Browse all tools →</Link>
      </aside>
    </div>
  );
}
