import type { Metadata } from "next";
import Link from "next/link";
import { posts } from "@/lib/blog";

export const metadata: Metadata = { title: "Blog — PDF guides", description: "Practical guides for working with PDFs: compress, merge, protect, sign and more." };
export default function Blog() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-extrabold tracking-tight">PDF guides</h1>
      <p className="mb-8 mt-2 text-slate-600">Short, practical how-tos.</p>
      <div className="space-y-4">{posts.map((p) => <Link key={p.slug} href={`/blog/${p.slug}`} className="card block transition hover:border-indigo-400"><h2 className="text-lg font-bold">{p.title}</h2><p className="mt-1 text-sm text-slate-600">{p.description}</p><p className="mt-2 text-xs text-slate-400">{p.date}</p></Link>)}</div>
    </div>
  );
}
