import type { Metadata, Viewport } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toolhub.example";
export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "ToolHub — Free Online PDF Tools", template: "%s | ToolHub" },
  description: "Free online PDF tools: merge, split, compress, convert, sign, protect and chat with PDFs. Most run privately in your browser.",
  openGraph: { type: "website", siteName: "ToolHub" },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f8fafc" }, { media: "(prefers-color-scheme: dark)", color: "#0b1020" }] };

// Runs before paint so there is no light/dark flash.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">Skip to content</a>
        <Header />
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
