"use client";
import Link from "next/link";
import { useMe } from "@/lib/useMe";

export default function AuthButton() {
  const me = useMe();
  if (process.env.NEXT_PUBLIC_STATIC_SITE === "1") return null;
  if (me === undefined) return <span className="h-8 w-20" aria-hidden />;
  if (!me) return <Link href="/login" className="btn !px-3 !py-1.5">Sign in</Link>;
  return (
    <Link href="/dashboard" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm font-medium hover:bg-slate-100" title={me.email}>
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{(me.name ?? me.email)[0].toUpperCase()}</span>
      <span className="hidden sm:inline">{me.plan === "FREE" ? "Account" : me.planName}</span>
    </Link>
  );
}
