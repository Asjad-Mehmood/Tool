import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signIn, currentUser, devLoginEnabled, emailEnabled, googleEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };
export const dynamic = "force-dynamic";
const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard");

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; sent?: string }> }) {
  const sp = await searchParams, next = safeNext(sp.next);
  if (await currentUser()) redirect(next);
  const none = !googleEnabled && !emailEnabled && !devLoginEnabled;
  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-center text-3xl font-extrabold tracking-tight">Sign in to ToolHub</h1>
      <p className="mb-6 mt-2 text-center text-slate-600">Save favourites, get more server tasks and use AI tools. No password needed.</p>
      <div className="card space-y-4 !p-6">
        {sp.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">Sign-in failed. Please try again.</p>}
        {sp.sent && <p className="rounded-lg bg-emerald-100 p-3 text-sm text-emerald-800" role="status">Check your inbox — we sent you a sign-in link.</p>}
        {googleEnabled && <form action={async () => { "use server"; await signIn("google", { redirectTo: next }); }}><button className="btn-ghost w-full !py-2.5">Continue with Google</button></form>}
        {emailEnabled && (
          <form className="space-y-2" action={async (fd: FormData) => { "use server"; await signIn("nodemailer", { email: String(fd.get("email") ?? ""), redirectTo: next }); }}>
            <label className="block text-sm font-medium">Email address<input name="email" type="email" required className="input mt-1" placeholder="you@example.com" /></label>
            <button className="btn w-full">Email me a sign-in link</button>
          </form>
        )}
        {devLoginEnabled && (
          <form className="space-y-2 rounded-lg border border-dashed border-amber-400 p-3" action={async (fd: FormData) => { "use server"; await signIn("dev", { email: String(fd.get("email") ?? ""), redirectTo: next }); }}>
            <p className="text-xs font-semibold text-amber-800">Development login (disabled in production)</p>
            <input name="email" type="email" required className="input" defaultValue="dev@example.com" aria-label="Dev email" />
            <button className="btn w-full">Continue as dev user</button>
          </form>
        )}
        {none && <p className="text-sm text-slate-600">Sign-in isn’t configured on this server. Set <code>AUTH_GOOGLE_ID</code>/<code>AUTH_GOOGLE_SECRET</code> or <code>EMAIL_SERVER</code>/<code>EMAIL_FROM</code> (see <code>.env.example</code>).</p>}
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">By signing in you agree to the <a className="underline" href="/terms">Terms</a> and <a className="underline" href="/privacy">Privacy policy</a>.</p>
    </div>
  );
}
