import type { Metadata } from "next";
import { Check } from "lucide-react";
export const metadata: Metadata = { title: "Pricing", description: "ToolHub is free today. Pro and Team plans are coming soon." };
const plans = [
  { name: "Free", price: "$0", note: "Available now", cta: "Start using tools", href: "/tools", features: ["All instant & in-browser tools, unlimited", "Server tools with fair-use limits", "Files up to 50 MB", "No sign-up needed"] },
  { name: "Pro", price: "Coming soon", note: "For heavy users", features: ["No ads", "Files up to 500 MB", "Batch processing & priority queue", "History & favourites", "Monthly AI credits"], soon: true },
  { name: "Team", price: "Coming soon", note: "For small teams", features: ["Everything in Pro", "Multiple seats", "Shared history", "Invoices"], soon: true },
];
export default function Pricing() {
  return (
    <div>
      <div className="mx-auto max-w-2xl text-center"><h1 className="text-4xl font-extrabold tracking-tight">Simple pricing</h1><p className="mt-2 text-slate-600">Everything you see today is free. Paid plans are in the works.</p></div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.name} className={`card flex flex-col !p-6 ${p.name === "Free" ? "!border-indigo-500 ring-2 ring-indigo-500/20" : ""}`}>
            <h2 className="text-lg font-bold">{p.name}</h2><p className="text-sm text-slate-500">{p.note}</p>
            <p className="my-4 text-3xl font-extrabold">{p.price}</p>
            <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-600">{p.features.map((f) => <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />{f}</li>)}</ul>
            {p.soon ? <button className="btn" disabled>Coming soon</button> : <a className="btn" href={p.href}>{p.cta}</a>}
          </div>
        ))}
      </div>
    </div>
  );
}
