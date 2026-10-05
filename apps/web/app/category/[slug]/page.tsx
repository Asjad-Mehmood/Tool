import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, tools, type CategoryId } from "@toolhub/registry";
import ToolsDirectory from "@/components/ToolsDirectory";
import { CategoryIcon } from "@/lib/ui";

export const dynamicParams = false;
const active = () => categories.filter((c) => tools.some((t) => t.category === c.id));
export const generateStaticParams = () => active().map((c) => ({ slug: c.id }));
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug, c = categories.find((x) => x.id === slug);
  return c ? { title: c.title, description: `${c.desc}. Free online ${c.title.toLowerCase()} on ToolHub.` } : {};
}
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug, c = categories.find((x) => x.id === slug);
  if (!c) notFound();
  return (
    <div>
      <nav className="mb-4 text-sm text-slate-500" aria-label="Breadcrumb"><Link href="/" className="hover:underline">Home</Link> / <Link href="/tools" className="hover:underline">Tools</Link> / {c.title}</nav>
      <div className="mb-6 flex items-center gap-4"><CategoryIcon id={c.id as CategoryId} size={56} /><div><h1 className="text-3xl font-extrabold tracking-tight">{c.title}</h1><p className="text-slate-600">{c.desc}</p></div></div>
      <ToolsDirectory category={c.id as CategoryId} hideCategoryFilter />
      <div className="mt-10 flex flex-wrap gap-2"><span className="text-sm text-slate-500">Other categories:</span>{active().filter((x) => x.id !== c.id).map((x) => <Link key={x.id} href={`/category/${x.id}`} className="chip">{x.title}</Link>)}</div>
    </div>
  );
}
