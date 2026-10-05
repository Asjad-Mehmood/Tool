import Link from "next/link";
import { Wrench } from "lucide-react";
import SearchBox from "./SearchBox";
import ThemeToggle from "./ThemeToggle";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow"><Wrench size={16} /></span>
      <span className="text-lg">Tool<span className="text-indigo-600">Hub</span></span>
    </Link>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
        <Logo />
        <nav className="ml-2 hidden items-center gap-1 text-sm font-medium text-slate-600 md:flex">
          <Link className="rounded-lg px-3 py-1.5 hover:bg-slate-100" href="/tools">All tools</Link>
          <Link className="rounded-lg px-3 py-1.5 hover:bg-slate-100" href="/category/pdf">PDF</Link>
          <Link className="rounded-lg px-3 py-1.5 hover:bg-slate-100" href="/category/image">Image</Link>
          <Link className="rounded-lg px-3 py-1.5 hover:bg-slate-100" href="/category/survey">Survey</Link>
          <Link className="rounded-lg px-3 py-1.5 hover:bg-slate-100" href="/pricing">Pricing</Link>
        </nav>
        <div className="ml-auto hidden w-full max-w-sm sm:block"><SearchBox /></div>
        <span className="ml-auto sm:hidden"><Link href="/tools" className="btn-ghost">Tools</Link></span>
        <ThemeToggle />
      </div>
      <div className="px-4 pb-2.5 sm:hidden"><SearchBox /></div>
    </header>
  );
}
