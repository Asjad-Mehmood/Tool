import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTool } from "@toolhub/registry";
import { getPost, posts } from "@/lib/blog";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamicParams = false;
export const generateStaticParams = () => posts.map((p) => ({ slug: p.slug }));
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getPost((await params).slug);
  return p ? { title: p.title, description: p.description, alternates: { canonical: `/blog/${p.slug}` }, openGraph: { type: "article", publishedTime: p.date } } : {};
}
export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const p = getPost((await params).slug);
  if (!p) notFound();
  const tool = getTool(p.tool);
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: p.title, description: p.description, datePublished: p.date, author: { "@type": "Organization", name: SITE_NAME }, mainEntityOfPage: `${SITE_URL}/blog/${p.slug}` };
  return (
    <article className="prose-tool mx-auto max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <nav className="mb-4 text-sm text-slate-500"><Link href="/blog" className="hover:underline">Blog</Link> / {p.title}</nav>
      <h1 className="text-4xl font-extrabold tracking-tight">{p.title}</h1>
      <p className="mt-1 text-sm text-slate-400">{p.date}</p>
      {p.body.map((b, i) => b.h ? <h2 key={i}>{b.h}</h2> : b.ul ? <ul key={i} className="mt-2">{b.ul.map((x) => <li key={x}>{x}</li>)}</ul> : <p key={i} className="mt-2">{b.p}</p>)}
      {tool && <div className="card mt-10 flex flex-wrap items-center justify-between gap-3 bg-indigo-50"><div><p className="font-semibold">Try it now: {tool.title}</p><p className="text-sm text-slate-600">{tool.shortDesc}</p></div><Link href={`/${tool.slug}`} className="btn">Open tool</Link></div>}
    </article>
  );
}
