"use client";
import { useState } from "react";

export default function CheckoutButton({ product, children, disabled, className = "btn" }: { product: string; children: React.ReactNode; disabled?: boolean; className?: string }) {
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const go = async () => {
    setBusy(true); setErr("");
    const r = await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product }) }), j = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = `/login?next=${encodeURIComponent(location.pathname)}`; return; }
    if (j.url) location.href = j.url; else { setErr(j.error ?? "Something went wrong"); setBusy(false); }
  };
  return <div><button className={className} disabled={disabled || busy} onClick={go}>{busy ? "Opening checkout…" : children}</button>{err && <p className="mt-1 text-xs text-red-600">{err}</p>}</div>;
}
