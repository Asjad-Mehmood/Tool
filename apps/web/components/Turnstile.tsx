"use client";
import { useEffect, useRef } from "react";

declare global { interface Window { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; remove: (id: string) => void } } }

/** Cloudflare Turnstile widget. Renders nothing unless NEXT_PUBLIC_TURNSTILE_SITEKEY is set. */
export default function Turnstile({ onToken }: { onToken: (t?: string) => void }) {
  const site = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY, el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!site || !el.current) return; let id: string | undefined, dead = false;
    const mount = () => { if (!dead && el.current && window.turnstile) id = window.turnstile.render(el.current, { sitekey: site, callback: (t: string) => onToken(t), "expired-callback": () => onToken(undefined) }); };
    if (window.turnstile) mount(); else if (!document.querySelector("script[data-turnstile]")) { const s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true; s.dataset.turnstile = "1"; s.onload = mount; document.head.appendChild(s); } else document.querySelector("script[data-turnstile]")!.addEventListener("load", mount);
    return () => { dead = true; if (id) window.turnstile?.remove(id); };
  }, [site, onToken]);
  return site ? <div ref={el} /> : null;
}
