import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTool } from "@toolhub/registry";
import { auth, currentUser, signOut } from "@/lib/auth";
import { balanceOf } from "@/lib/credits";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { usageToday } from "@/lib/quota";
import CheckoutButton from "@/components/CheckoutButton";
import { PortalButton } from "@/components/DashboardActions";
import ApiKeys from "@/components/ApiKeys";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const u = await currentUser();
  if (!u) { void auth; redirect("/login?next=/dashboard"); }
  const sp = await searchParams, plan = PLANS[u.plan];
  const [used, jobs, favs, sub, keys] = await Promise.all([
    usageToday(u.id), db.job.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 15 }), db.favorite.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" } }),
    db.subscription.findUnique({ where: { userId: u.id } }),
    db.apiKey.findMany({ where: { userId: u.id, revokedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, prefix: true, lastUsed: true, createdAt: true } }),
  ]);
  const bal = balanceOf(u), pct = Math.min(100, Math.round((used / plan.tasksPerDay) * 100));
  const statusStyle: Record<string, string> = { DONE: "text-emerald-700", FAILED: "text-red-600", EXPIRED: "text-slate-400", QUEUED: "text-amber-700", PROCESSING: "text-amber-700" };
  return (
    <div className="space-y-8">
      {sp.checkout === "success" && <p className="rounded-lg bg-emerald-100 p-3 text-sm text-emerald-800" role="status">Thanks! Your purchase is being applied — it can take a few seconds to show up. Refresh if your plan hasn’t changed.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1><p className="text-slate-600">{u.email}</p></div>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}><button className="btn-ghost">Sign out</button></form>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="card space-y-3" aria-labelledby="plan-h">
          <h2 id="plan-h" className="text-sm font-semibold uppercase tracking-wide text-slate-500">Plan</h2>
          <p className="text-2xl font-extrabold">{plan.name}</p>
          {sub && <p className="text-xs text-slate-500">{sub.status === "cancelled" ? `Ends ${sub.endsAt?.toDateString()}` : sub.renewsAt ? `Renews ${sub.renewsAt.toDateString()}` : sub.status}</p>}
          {u.plan === "FREE" ? <Link href="/pricing" className="btn w-full">Upgrade</Link> : <PortalButton />}
        </section>
        <section className="card space-y-3" aria-labelledby="usage-h">
          <h2 id="usage-h" className="text-sm font-semibold uppercase tracking-wide text-slate-500">Server tasks today</h2>
          <p className="text-2xl font-extrabold">{used} <span className="text-base font-medium text-slate-500">/ {plan.tasksPerDay}</span></p>
          <div className="h-2 overflow-hidden rounded bg-slate-200"><div className="h-full bg-indigo-600" style={{ width: `${pct}%` }} /></div>
          <p className="text-xs text-slate-500">Resets at midnight UTC. In-browser tools are unlimited.</p>
        </section>
        <section className="card space-y-3" aria-labelledby="ai-h">
          <h2 id="ai-h" className="text-sm font-semibold uppercase tracking-wide text-slate-500">AI credits</h2>
          <p className="text-2xl font-extrabold">{bal.total}</p>
          <p className="text-xs text-slate-500">{bal.monthlyLeft} monthly (of {plan.monthlyCredits}) + {bal.purchased} purchased</p>
          <CheckoutButton product="credits_100" className="btn-ghost w-full">Buy 100 credits</CheckoutButton>
        </section>
      </div>

      <section aria-labelledby="fav-h"><h2 id="fav-h" className="section-title mb-3">Favourite tools</h2>
        {favs.length ? <div className="flex flex-wrap gap-2">{favs.map((f) => { const t = getTool(f.tool); return t ? <Link key={f.tool} href={`/${f.tool}`} className="chip">★ {t.title}</Link> : null; })}</div> : <p className="text-sm text-slate-500">Nothing saved yet — use the “Save” button on any tool.</p>}
      </section>

      <section aria-labelledby="hist-h"><h2 id="hist-h" className="section-title mb-3">Recent server jobs</h2>
        {jobs.length ? (
          <div className="card overflow-x-auto !p-0"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-2">Tool</th><th>File</th><th>Status</th><th>When</th></tr></thead><tbody>
            {jobs.map((j) => { const eff = j.status !== "DONE" && j.status !== "FAILED" && j.expiresAt < new Date() ? "EXPIRED" : j.status; return <tr key={j.id} className="border-t border-slate-200"><td className="px-4 py-2">{getTool(j.tool)?.title ?? j.tool}</td><td className="max-w-[14rem] truncate">{j.inputNames[0] ?? "—"}</td><td className={`font-medium ${statusStyle[eff]}`}>{eff.toLowerCase()}</td><td className="text-slate-500">{j.createdAt.toLocaleString("en-GB", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC</td></tr>; })}
          </tbody></table></div>
        ) : <p className="text-sm text-slate-500">No server jobs yet. Results are deleted after 1 hour; only the history entry is kept.</p>}
      </section>

      <ApiKeys initial={keys.map((k) => ({ ...k, lastUsed: k.lastUsed?.toISOString() ?? null, createdAt: k.createdAt.toISOString() }))} allowed={plan.apiPerDay > 0} />
    </div>
  );
}
