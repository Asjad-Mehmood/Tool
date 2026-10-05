"use client";
import { Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMe } from "@/lib/useMe";

export default function FavoriteButton({ slug }: { slug: string }) {
  const me = useMe(), [fav, setFav] = useState(false);
  useEffect(() => { if (me) fetch("/api/favorites").then((r) => r.json()).then((j) => setFav((j.favorites ?? []).includes(slug))); }, [me, slug]);
  if (me === undefined) return null;
  if (!me) return <Link href={`/login?next=/${slug}`} className="btn-ghost" title="Sign in to save favourites"><Star size={14} /> Save</Link>;
  const toggle = async () => { const next = !fav; setFav(next); await fetch("/api/favorites", { method: next ? "POST" : "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ tool: slug }) }); };
  return <button className="btn-ghost" onClick={toggle} aria-pressed={fav}><Star size={14} className={fav ? "fill-amber-400 text-amber-500" : ""} /> {fav ? "Saved" : "Save"}</button>;
}
