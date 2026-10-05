"use client";
import Link from "next/link";
import { useRef, useState, type ComponentType } from "react";
import { Download, Send, Sparkles } from "lucide-react";
import { Select, download } from "@/components/templates";
import { AI_MAX, LANGS, costOf, type AiSlug } from "@/lib/ai-shared";
import { extractPages } from "@/lib/pdfjs";
import { refreshMe, useMe } from "@/lib/useMe";

interface Doc { name: string; text: string; pages: number }
type Result = { ok: true; credits: number } | { ok: false; error: string; code?: string };

/** POST to the AI route and feed the streamed text to `onText`. */
async function callAi(slug: AiSlug, body: object, onText: (t: string) => void, signal?: AbortSignal): Promise<Result> {
  const r = await fetch(`/api/ai/${slug}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
  if (!r.ok) { const j = await r.json().catch(() => ({})); return { ok: false, error: j.error ?? "Request failed", code: j.code }; }
  const reader = r.body!.getReader(), dec = new TextDecoder();
  for (;;) { const { done, value } = await reader.read(); if (done) break; onText(dec.decode(value, { stream: true })); }
  refreshMe();
  return { ok: true, credits: Number(r.headers.get("x-credits-left") ?? 0) };
}

function Gate({ slug, children }: { slug: AiSlug; children: React.ReactNode }) {
  const me = useMe();
  if (me === undefined) return <p className="text-slate-500">Loading…</p>;
  if (!me) return <div className="rounded-xl border border-dashed border-indigo-400 bg-indigo-50 p-6 text-center"><Sparkles className="mx-auto mb-2 text-indigo-600" /><p className="font-semibold">Sign in to use AI tools</p><p className="mb-4 text-sm text-slate-600">Free accounts include AI credits every month. No card needed.</p><Link className="btn" href={`/login?next=/${slug}`}>Sign in</Link></div>;
  return <>{children}<p className="mt-3 text-xs text-slate-500">{me.credits.total} AI credit{me.credits.total === 1 ? "" : "s"} left · {me.credits.monthlyLeft} monthly + {me.credits.purchased} purchased · <Link className="underline" href="/pricing">get more</Link></p></>;
}

function Picker({ slug, onDoc }: { slug: AiSlug; onDoc: (d: Doc | null) => void }) {
  const [msg, setMsg] = useState(""), [err, setErr] = useState(""), [doc, setDoc] = useState<Doc | null>(null);
  const pick = async (f?: File) => {
    onDoc(null); setDoc(null); setErr(""); if (!f) return;
    try {
      const pages = await extractPages(f, (n, t) => setMsg(`Reading page ${n} of ${t}…`)), text = pages.map((p, i) => `--- Page ${i + 1} ---\n${p}`).join("\n\n");
      setMsg("");
      if (!pages.join("").trim()) return setErr("No text found. This looks like a scanned PDF — run it through OCR PDF first.");
      if (text.length > AI_MAX[slug]) return setErr(`This PDF has ${text.length.toLocaleString()} characters of text; the limit for this tool is ${AI_MAX[slug].toLocaleString()}.${slug === "translate-pdf" ? " Split the PDF into smaller parts first." : ""}`);
      const d = { name: f.name, text, pages: pages.length }; setDoc(d); onDoc(d);
    } catch { setMsg(""); setErr("Could not read this PDF (it may be encrypted or damaged)."); }
  };
  return (
    <div className="space-y-2">
      <input type="file" accept=".pdf,application/pdf" className="input" onChange={(e) => pick(e.target.files?.[0])} />
      {msg && <p className="text-sm text-slate-500">{msg}</p>}
      {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
      {doc && <p className="text-sm text-slate-500">{doc.pages} page{doc.pages === 1 ? "" : "s"} · {doc.text.length.toLocaleString()} characters read in your browser. Only this text is sent to the AI — never the PDF file.</p>}
    </div>
  );
}

function ErrorNote({ r }: { r: Extract<Result, { ok: false }> }) {
  return <p className="text-sm text-red-600" role="alert">{r.error} {r.code === "credits" && <Link className="font-medium underline" href="/pricing">Get credits →</Link>}{r.code === "auth" && <Link className="font-medium underline" href="/login">Sign in →</Link>}</p>;
}

function Summarize() {
  const [doc, setDoc] = useState<Doc | null>(null), [length, setLength] = useState("medium"), [out, setOut] = useState(""), [busy, setBusy] = useState(false), [res, setRes] = useState<Result>();
  const run = async () => { if (!doc) return; setBusy(true); setOut(""); setRes(undefined); setRes(await callAi("summarize-pdf", { text: doc.text, length }, (t) => setOut((o) => o + t))); setBusy(false); };
  return (
    <Gate slug="summarize-pdf"><div className="space-y-4">
      <Picker slug="summarize-pdf" onDoc={setDoc} />
      <Select label="Length" value={length} onChange={setLength} options={[{ value: "short", label: "Short (3–5 sentences)" }, { value: "medium", label: "Standard (summary + key points)" }, { value: "detailed", label: "Detailed (by section)" }]} />
      <div className="flex items-center gap-3"><button className="btn" disabled={!doc || busy} onClick={run}><Sparkles size={14} /> {busy ? "Summarizing…" : `Summarize${doc ? ` (${costOf("summarize-pdf", doc.text.length)} credit${costOf("summarize-pdf", doc.text.length) === 1 ? "" : "s"})` : ""}`}</button>{out && <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(out)}>Copy</button>}</div>
      {res && !res.ok && <ErrorNote r={res} />}
      {out && <div className="card whitespace-pre-wrap text-sm leading-relaxed" aria-live="polite">{out}</div>}
      <p className="text-xs text-slate-500">AI can make mistakes — check important details against the original.</p>
    </div></Gate>
  );
}

function Translate() {
  const [doc, setDoc] = useState<Doc | null>(null), [language, setLanguage] = useState("Arabic"), [out, setOut] = useState(""), [busy, setBusy] = useState(false), [res, setRes] = useState<Result>();
  const run = async () => { if (!doc) return; setBusy(true); setOut(""); setRes(undefined); setRes(await callAi("translate-pdf", { text: doc.text, language }, (t) => setOut((o) => o + t))); setBusy(false); };
  return (
    <Gate slug="translate-pdf"><div className="space-y-4">
      <Picker slug="translate-pdf" onDoc={setDoc} />
      <Select label="Translate into" value={language} onChange={setLanguage} options={LANGS} />
      <div className="flex items-center gap-3"><button className="btn" disabled={!doc || busy} onClick={run}>{busy ? "Translating…" : `Translate${doc ? ` (${costOf("translate-pdf", doc.text.length)} credits)` : ""}`}</button>{out && !busy && <button className="btn-ghost" onClick={() => download(new Blob([out], { type: "text/plain;charset=utf-8" }), `${doc?.name.replace(/\.pdf$/i, "")}-${language}.txt`)}><Download size={14} /> Download .txt</button>}</div>
      {res && !res.ok && <ErrorNote r={res} />}
      {out && <div className="card max-h-[30rem] overflow-auto whitespace-pre-wrap text-sm leading-relaxed" dir="auto" aria-live="polite">{out}</div>}
      <p className="text-xs text-slate-500">Cost is 1 credit per ~10,000 characters. The result is plain text; formatting and images from the PDF aren’t reproduced.</p>
    </div></Gate>
  );
}

interface Msg { role: "user" | "assistant"; content: string }
function Chat() {
  const [doc, setDoc] = useState<Doc | null>(null), [msgs, setMsgs] = useState<Msg[]>([]), [q, setQ] = useState(""), [busy, setBusy] = useState(false), [res, setRes] = useState<Result>();
  const end = useRef<HTMLDivElement>(null);
  const send = async () => {
    if (!doc || !q.trim() || busy) return; const question = q.trim(), history = msgs; setQ(""); setBusy(true); setRes(undefined);
    setMsgs([...history, { role: "user", content: question }, { role: "assistant", content: "" }]);
    const r = await callAi("chat-with-pdf", { text: doc.text, question, history }, (t) => { setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: c[c.length - 1].content + t }; return c; }); end.current?.scrollIntoView({ block: "nearest" }); });
    if (!r.ok) setMsgs((m) => m.slice(0, -2)); // drop the failed exchange so history stays valid
    setRes(r); setBusy(false);
  };
  return (
    <Gate slug="chat-with-pdf"><div className="space-y-4">
      <Picker slug="chat-with-pdf" onDoc={(d) => { setDoc(d); setMsgs([]); }} />
      {doc && (
        <div className="space-y-3">
          <div className="card max-h-[28rem] min-h-40 space-y-3 overflow-auto" aria-live="polite">
            {!msgs.length && <p className="text-sm text-slate-500">Ask anything about “{doc.name}”. Each question uses 1 credit.</p>}
            {msgs.map((m, i) => <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "ml-auto bg-indigo-600 text-white" : "bg-slate-100"}`}>{m.content || "…"}</div>)}
            <div ref={end} />
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input className="input" placeholder="Ask a question about this PDF…" value={q} onChange={(e) => setQ(e.target.value)} disabled={busy} maxLength={2000} />
            <button className="btn" disabled={busy || !q.trim()}><Send size={14} /> Ask</button>
          </form>
          {res && !res.ok && <ErrorNote r={res} />}
        </div>
      )}
      <p className="text-xs text-slate-500">Answers come only from your document and can contain mistakes — verify anything important.</p>
    </div></Gate>
  );
}

export const tools: Record<string, ComponentType> = { "summarize-pdf": Summarize, "translate-pdf": Translate, "chat-with-pdf": Chat };
