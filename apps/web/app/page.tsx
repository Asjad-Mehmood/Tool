import Link from "next/link";
import { ArrowRight, Gauge, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { getTool, groups, tools, toolsByGroup, type Tool } from "@toolhub/registry";
import SearchBox from "@/components/SearchBox";
import ToolCard from "@/components/ToolCard";
import { RecentTools } from "@/components/Recents";
import { GroupIcon } from "@/lib/ui";

const POPULAR = ["pdf-editor", "merge-pdf", "compress-pdf", "split-pdf", "word-to-pdf", "pdf-to-jpg", "sign-pdf", "protect-pdf"];
const CHIPS = ["merge-pdf", "compress-pdf", "ocr-pdf", "unlock-pdf", "summarize-pdf"];
const isTool = (t: Tool | undefined): t is Tool => !!t;

export default function Home() {
  const popular = POPULAR.map(getTool).filter(isTool), chips = CHIPS.map(getTool).filter(isTool);
  return (
    <div className="-mt-8 space-y-16">
      <section className="hero-bg -mx-4 px-4 pb-12 pt-14 text-center sm:pt-20">
        <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"><Lock size={12} className="text-emerald-600" /> Most tools run in your browser — your files never leave your device</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">Every PDF tool you need, <span className="bg-gradient-to-r from-red-600 to-rose-500 bg-clip-text text-transparent">free and private</span></h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">Merge, split, compress, convert, sign, protect and chat with your PDFs. No sign-up needed.</p>
        <div className="mx-auto mt-8 max-w-2xl"><SearchBox large /></div>
        <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">{chips.map((t) => <Link key={t.slug} href={`/${t.slug}`} className="chip">{t.title}</Link>)}</div>
      </section>

      <RecentTools />

      <section>
        <div className="mb-4 flex items-end justify-between"><h2 className="section-title">Most used</h2><Link href="/tools" className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">All {tools.length} tools <ArrowRight size={14} /></Link></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{popular.map((t) => <ToolCard key={t.slug} tool={t} />)}</div>
      </section>

      {groups.filter((g) => g.id !== "ai").map((g) => (
        <section key={g.id}>
          <div className="mb-4 flex items-center gap-3"><GroupIcon id={g.id} size={40} /><div><h2 className="section-title !text-lg">{g.title}</h2><p className="text-sm text-slate-500">{g.desc}</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{toolsByGroup(g.id).map((t) => <ToolCard key={t.slug} tool={t} compact />)}</div>
        </section>
      ))}

      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 to-indigo-700 p-6 text-white shadow-lg sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-fuchsia-200"><Sparkles size={16} /> New · AI PDF tools</p>
            <h2 className="text-3xl font-extrabold tracking-tight">Understand any PDF in seconds</h2>
            <p className="mt-3 text-fuchsia-100">Summarize long documents, ask questions and get answers from the text, or translate a PDF into another language. Text is extracted in your browser; only the text is sent to the AI.</p>
            <Link href="/category/ai" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">Try AI tools <ArrowRight size={14} /></Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-1">{toolsByGroup("ai").map((t) => <Link key={t.slug} href={`/${t.slug}`} className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur transition hover:bg-white/20"><span className="block text-sm font-semibold">{t.title}</span><span className="text-sm text-fuchsia-100">{t.shortDesc}</span></Link>)}</div>
        </div>
      </section>

      <section>
        <h2 className="section-title mb-6 text-center">Why people choose ToolHub</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { i: Lock, t: "Your files stay yours", d: "Merge, split, rotate, sign and more run right in your browser. Anything sent to our servers is deleted automatically within an hour." },
            { i: Gauge, t: "Fast and free", d: "No watermarks, no waiting in line. Heavier jobs like Word→PDF and OCR run on a dedicated worker." },
            { i: ShieldCheck, t: "Built to be safe", d: "Isolated workers, verified file types and strict limits. Unlock only works with the password you already know." },
          ].map(({ i: I, t, d }) => <div key={t} className="card p-6"><span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><I size={20} /></span><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-slate-500">{d}</p></div>)}
        </div>
      </section>
    </div>
  );
}
