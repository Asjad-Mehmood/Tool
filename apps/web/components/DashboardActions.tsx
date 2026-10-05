"use client";
import { useState } from "react";

export function PortalButton() {
  const [err, setErr] = useState("");
  return <div><button className="btn-ghost" onClick={async () => { const r = await fetch("/api/billing/portal", { method: "POST" }), j = await r.json(); if (j.url) location.href = j.url; else setErr(j.error ?? "Unavailable"); }}>Manage billing</button>{err && <p className="mt-1 text-xs text-red-600">{err}</p>}</div>;
}
