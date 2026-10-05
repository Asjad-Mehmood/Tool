"use client";
import { useEffect, useState } from "react";

export interface Me { id: string; name: string | null; email: string; image: string | null; plan: "FREE" | "PRO" | "TEAM"; planName: string; ads: boolean; credits: { monthlyLeft: number; purchased: number; total: number }; tasksToday: number; tasksPerDay: number }
let cache: { at: number; p: Promise<Me | null> } | null = null;
export const refreshMe = () => { cache = null; };
const load = () => {
  if (!cache || Date.now() - cache.at > 30_000) cache = { at: Date.now(), p: fetch("/api/me", { cache: "no-store" }).then((r) => r.json()).then((j) => j.user ?? null).catch(() => null) };
  return cache.p;
};
/** undefined while loading, null when signed out. */
export function useMe(): Me | null | undefined {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  useEffect(() => { let live = true; load().then((m) => live && setMe(m)); return () => { live = false; }; }, []);
  return me;
}
