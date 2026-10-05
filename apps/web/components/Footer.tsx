import Link from "next/link";
import { groups } from "@toolhub/registry";
import { Logo } from "./Header";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3"><Logo /><p className="max-w-xs text-sm text-slate-500">Free online PDF tools — merge, compress, convert, sign and more. Most run privately in your browser.</p></div>
        <div><h3 className="mb-3 text-sm font-semibold">PDF tools</h3><ul className="space-y-2 text-sm text-slate-500">{groups.slice(0, 4).map((g) => <li key={g.id}><Link className="hover:text-indigo-600" href={`/category/${g.id}`}>{g.title}</Link></li>)}</ul></div>
        <div><h3 className="mb-3 text-sm font-semibold">More</h3><ul className="space-y-2 text-sm text-slate-500">{groups.slice(4).map((g) => <li key={g.id}><Link className="hover:text-indigo-600" href={`/category/${g.id}`}>{g.title}</Link></li>)}<li><Link className="hover:text-indigo-600" href="/blog">Blog</Link></li><li><Link className="hover:text-indigo-600" href="/docs/api">API</Link></li></ul></div>
        <div><h3 className="mb-3 text-sm font-semibold">Company</h3><ul className="space-y-2 text-sm text-slate-500">
          <li><Link className="hover:text-indigo-600" href="/about">About</Link></li><li><Link className="hover:text-indigo-600" href="/pricing">Pricing</Link></li>
          <li><Link className="hover:text-indigo-600" href="/privacy">Security &amp; Privacy</Link></li><li><Link className="hover:text-indigo-600" href="/terms">Terms</Link></li></ul></div>
      </div>
      <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">© {new Date().getFullYear()} ToolHub</div>
    </footer>
  );
}
