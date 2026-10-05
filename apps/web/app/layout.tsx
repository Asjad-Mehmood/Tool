import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ToolHub — All-in-One Online Tools", template: "%s | ToolHub" },
  description: "Free online tools for PDF, images, text, developers, converters, calculators and survey work. Most run in your browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold text-indigo-600">ToolHub</Link>
            <span className="text-xs text-slate-500">Private by design — most tools run in your browser</span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">© ToolHub</footer>
      </body>
    </html>
  );
}
