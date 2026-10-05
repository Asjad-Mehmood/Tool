import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { groups, type PdfGroup } from "@toolhub/registry";
import ToolsDirectory from "@/components/ToolsDirectory";
import { GroupIcon } from "@/lib/ui";

export const dynamicParams = false;
export const generateStaticParams = () => groups.map((g) => ({ slug: g.id }));
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug, g = groups.find((x) => x.id === slug);
  return g ? { title: g.title, description: `${g.desc}. Free online ${g.title.toLowerCase()} on ToolHub.` } : {};
}
export default async function GroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug, g = groups.find((x) => x.id === slug);
  if (!g) notFound();
  return (
    <div>
      <nav className="mb-4 text-sm text-slate-500" aria-label="Breadcrumb"><Link href="/" className="hover:underline">Home</Link> / <Link href="/tools" className="hover:underline">Tools</Link> / {g.title}</nav>
      <div className="mb-6 flex items-center gap-4"><GroupIcon id={g.id as PdfGroup} size={56} /><div><h1 className="text-3xl font-extrabold tracking-tight">{g.title}</h1><p className="text-slate-600">{g.desc}</p></div></div>
      <ToolsDirectory group={g.id as PdfGroup} hideGroupFilter />
      <div className="mt-10 flex flex-wrap gap-2"><span className="text-sm text-slate-500">More:</span>{groups.filter((x) => x.id !== g.id).map((x) => <Link key={x.id} href={`/category/${x.id}`} className="chip">{x.title}</Link>)}</div>
    </div>
  );
}
