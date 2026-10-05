import Link from "next/link";
import { ArrowRight, Cloud, Lock, Monitor, Zap, Compass, Gauge, Globe2 } from "lucide-react";
import { categories, getTool, tools, type Tool } from "@toolhub/registry";
import SearchBox from "@/components/SearchBox";
import ToolCard from "@/components/ToolCard";
import { RecentTools } from "@/components/Recents";
import { CategoryIcon } from "@/lib/ui";

const POPULAR = ["merge-pdf", "compress-pdf", "word-to-pdf", "compress-image", "json-formatter", "qr-code-generator", "area-converter", "coordinate-converter"];
const CHIPS = ["merge-pdf", "heic-to-jpg", "word-counter", "password-generator", "loan-emi-calculator", "dns-lookup"];
const isTool = (t: Tool | undefined): t is Tool => !!t;

export default function Home() {
  const popular = POPULAR.map(getTool).filter(isTool), chips = CHIPS.map(getTool).filter(isTool);
  const survey = tools.filter((t) => t.category === "survey").slice(0, 6);
  const cats = categories.map((c) => ({ ...c, count: tools.filter((t) => t.category === c.id).length })).filter((c) => c.count);
  return (
    <div className="-mt-8 space-y-16">
      <section className="hero-bg -mx-4 px-4 pb-12 pt-14 text-center sm:pt-20">
        <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"><Lock size={12} className="text-emerald-600" /> Private by design — most tools never upload your files</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">Every online tool you need, <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">in one place</span></h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">PDF, image, video, developer, security, calculators and survey tools. Free, fast, no sign-up.</p>
        <div className="mx-auto mt-8 max-w-2xl"><SearchBox large /></div>
        <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
          {chips.map((t) => <Link key={t.slug} href={`/${t.slug}`} className="chip">{t.title}</Link>)}
        </div>
        <dl className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-4 text-center">
          {[[`${tools.length}+`, "tools"], [`${cats.length}`, "categories"], ["$0", "to use"]].map(([n, l]) => <div key={l}><dt className="text-2xl font-extrabold sm:text-3xl">{n}</dt><dd className="text-xs text-slate-500 sm:text-sm">{l}</dd></div>)}
        </dl>
      </section>

      <RecentTools />

      <section>
        <div className="mb-4 flex items-end justify-between"><h2 className="section-title">Popular tools</h2><Link href="/tools" className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">View all <ArrowRight size={14} /></Link></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{popular.map((t) => <ToolCard key={t.slug} tool={t} />)}</div>
      </section>

      <section>
        <h2 className="section-title mb-4">Browse by category</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cats.map((c) => (
            <Link key={c.id} href={`/category/${c.id}`} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md">
              <CategoryIcon id={c.id} size={46} />
              <span className="min-w-0"><span className="block font-semibold group-hover:text-indigo-600">{c.title}</span><span className="block truncate text-xs text-slate-500">{c.desc}</span><span className="text-xs font-medium text-slate-400">{c.count} tools</span></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-lg sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-indigo-200"><Compass size={16} /> Survey &amp; Engineering</p>
            <h2 className="text-3xl font-extrabold tracking-tight">Built for surveyors and engineers</h2>
            <p className="mt-3 text-indigo-100">Convert between lat/long, UTM and national grids, compute bearings and areas, and work in marla and kanal — tools most general sites don’t offer.</p>
            <Link href="/category/survey" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">Explore survey tools <ArrowRight size={14} /></Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">{survey.map((t) => <Link key={t.slug} href={`/${t.slug}`} className="rounded-xl bg-white/10 px-4 py-3 text-sm font-medium backdrop-blur transition hover:bg-white/20">{t.title}</Link>)}</div>
        </div>
      </section>

      <section>
        <h2 className="section-title mb-6 text-center">Why people choose ToolHub</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { i: Lock, t: "Your files stay yours", d: "Most tools process files right in your browser. Anything sent to our servers is deleted automatically within an hour." },
            { i: Gauge, t: "Fast and free", d: "No sign-up, no watermarks, no waiting. Instant and in-browser tools work even on slow connections." },
            { i: Globe2, t: "Made for the Gulf & Pakistan", d: "Marla/kanal units, gratuity and zakat calculators, local coordinate systems — and more on the way, including Arabic and Urdu." },
          ].map(({ i: I, t, d }) => <div key={t} className="card p-6"><span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><I size={20} /></span><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-slate-500">{d}</p></div>)}
        </div>
      </section>

      <section className="card grid gap-4 p-6 sm:grid-cols-3">
        {[[Zap, "Instant", "Pure browser maths and text. Nothing to upload."], [Monitor, "In your browser", "Files are processed on your device with WebAssembly."], [Cloud, "On our servers", "Heavier jobs like Word→PDF run on a secure worker; files auto-delete."]].map(([I, t, d]) => {
          const Icon = I as typeof Zap; return <div key={t as string} className="flex gap-3"><Icon size={20} className="mt-0.5 shrink-0 text-indigo-600" /><div><h3 className="text-sm font-semibold">{t as string}</h3><p className="text-sm text-slate-500">{d as string}</p></div></div>;
        })}
      </section>
    </div>
  );
}
