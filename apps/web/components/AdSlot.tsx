"use client";
import { useEffect, useRef } from "react";
import { useMe } from "@/lib/useMe";

/** Google AdSense unit. Renders nothing unless NEXT_PUBLIC_ADSENSE_CLIENT is set, and never for paying users. Keep it away from download buttons. */
export default function AdSlot({ slot }: { slot: string }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT, me = useMe(), pushed = useRef(false);
  const show = Boolean(client) && me !== undefined && (me === null || me.ads);
  useEffect(() => {
    if (!show || pushed.current) return; pushed.current = true;
    if (!document.querySelector("script[data-adsense]")) { const s = document.createElement("script"); s.async = true; s.dataset.adsense = "1"; s.crossOrigin = "anonymous"; s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`; document.head.appendChild(s); }
    try { ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle ??= []).push({}); } catch { /* blocked */ }
  }, [show, client]);
  if (!show) return null;
  return <div className="overflow-hidden rounded-xl border border-dashed border-slate-300 p-1 text-center text-[10px] uppercase tracking-wide text-slate-400"><span>Advertisement</span><ins className="adsbygoogle block" style={{ display: "block", minHeight: 100 }} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" /></div>;
}
