import Link from "next/link";
import { FileText } from "lucide-react";
import SearchBox from "./SearchBox";
import ThemeToggle from "./ThemeToggle";
import AuthButton from "./AuthButton";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-white shadow"><FileText size={16} /></span>
      <span className="text-lg">Tool<span className="text-rose-600">Hub</span> <span className="text-xs font-semibold text-slate-400">PDF</span></span>
    </Link>
  );
}

const NAV: [string, string][] = [["All tools", "/tools"], ["Organize", "/category/organize"], ["Convert", "/category/to-pdf"], ["Edit", "/category/edit"], ["AI", "/category/ai"], ["Pricing", "/pricing"]];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
        <Logo />
        <nav className="ml-2 hidden items-center gap-0.5 text-sm font-medium text-slate-600 lg:flex">
          {NAV.map(([l, h]) => <Link key={h} className="rounded-lg px-3 py-1.5 hover:bg-slate-100" href={h}>{l}</Link>)}
        </nav>
        <div className="ml-auto hidden w-full max-w-xs sm:block"><SearchBox /></div>
        <span className="ml-auto sm:hidden"><Link href="/tools" className="btn-ghost">Tools</Link></span>
        <ThemeToggle />
        <AuthButton />
      </div>
      <div className="px-4 pb-2.5 sm:hidden"><SearchBox /></div>
    </header>
  );
}
