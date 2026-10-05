import type { Metadata } from "next";
import { Check } from "lucide-react";
import Link from "next/link";
import CheckoutButton from "@/components/CheckoutButton";
import { billingConfigured } from "@/lib/billing";
import { PLANS, PRICES, variantFor } from "@/lib/plans";

export const metadata: Metadata = { title: "Pricing", description: "ToolHub PDF tools are free to use. Upgrade for higher limits, larger files, API access and more AI credits." };
export const dynamic = "force-dynamic"; // reads billing configuration at request time

export default function Pricing() {
  const on = billingConfigured(), has = (p: Parameters<typeof variantFor>[0]) => on && Boolean(variantFor(p));
  const F = PLANS.FREE, P = PLANS.PRO;
  return (
    <div>
      <div className="mx-auto max-w-2xl text-center"><h1 className="text-4xl font-extrabold tracking-tight">Simple pricing</h1><p className="mt-2 text-slate-600">Every browser-based tool is free and unlimited. Upgrade when you need more server power or AI.</p></div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <Plan name="Free" price="$0" note="No sign-up needed" features={["All in-browser PDF tools, unlimited", `${PLANS.FREE.tasksPerDay} server tasks per day (5 without an account)`, "Files up to 50 MB", `${F.monthlyCredits} AI credits per month`, "Ads shown"]} cta={<Link className="btn w-full" href="/tools">Start using tools</Link>} />
        <Plan highlight name="Pro" price={`$${PRICES.proMonthly}`} per="/month" note={`or $${PRICES.proYearly}/year (save 25%)`} features={[`${P.tasksPerDay} server tasks per day`, "Files up to 500 MB", "No ads", `${P.monthlyCredits} AI credits per month`, "History & favourites", `API access (${P.apiPerDay.toLocaleString()} requests/day)`]}
          cta={<div className="space-y-2"><CheckoutButton product="pro_monthly" disabled={!has("pro_monthly")} className="btn w-full">Upgrade monthly</CheckoutButton><CheckoutButton product="pro_yearly" disabled={!has("pro_yearly")} className="btn-ghost w-full">Upgrade yearly</CheckoutButton>{!on && <p className="text-center text-xs text-slate-500">Billing isn’t configured on this server yet.</p>}</div>} />
        <Plan name="Team" price="$24" per="/month" note="Higher limits for teams" features={[`${PLANS.TEAM.tasksPerDay.toLocaleString()} server tasks per day`, "Files up to 500 MB", `${PLANS.TEAM.monthlyCredits} AI credits per month`, `API access (${PLANS.TEAM.apiPerDay.toLocaleString()} requests/day)`, "Shared seats & invoices: coming soon"]}
          cta={<CheckoutButton product="team_monthly" disabled={!has("team_monthly")} className="btn-ghost w-full">Choose Team</CheckoutButton>} />
      </div>
      <div className="card mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-between gap-4 !p-5">
        <div><h2 className="font-bold">AI credit pack</h2><p className="text-sm text-slate-500">{PRICES.creditPack.credits} credits for ${PRICES.creditPack.price}. Credits never expire and are used after your monthly allowance.</p></div>
        <CheckoutButton product="credits_100" disabled={!has("credits_100")} className="btn">Buy credits</CheckoutButton>
      </div>
    </div>
  );
}

function Plan({ name, price, per, note, features, cta, highlight }: { name: string; price: string; per?: string; note: string; features: string[]; cta: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`card flex flex-col !p-6 ${highlight ? "!border-indigo-500 ring-2 ring-indigo-500/20" : ""}`}>
      {highlight && <span className="mb-2 w-fit rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">Most popular</span>}
      <h2 className="text-lg font-bold">{name}</h2><p className="text-sm text-slate-500">{note}</p>
      <p className="my-4"><span className="text-4xl font-extrabold">{price}</span>{per && <span className="text-slate-500">{per}</span>}</p>
      <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-600">{features.map((f) => <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />{f}</li>)}</ul>
      {cta}
    </div>
  );
}
