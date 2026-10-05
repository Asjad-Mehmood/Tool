import Link from "next/link";
import SearchBox from "@/components/SearchBox";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-6xl font-extrabold text-indigo-600">404</p>
      <h1 className="mt-2 text-2xl font-bold">We couldn’t find that page</h1>
      <p className="mb-6 mt-1 text-slate-600">Try searching for the tool you need.</p>
      <SearchBox /><div className="mt-6"><Link href="/" className="btn">Back to home</Link></div>
    </div>
  );
}
