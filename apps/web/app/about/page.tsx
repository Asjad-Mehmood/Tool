import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "About", description: "Why ToolHub exists and how it works." };
export default function About() {
  return (
    <article className="prose-tool mx-auto max-w-3xl">
      <h1 className="text-4xl font-extrabold tracking-tight">About ToolHub</h1>
      <p className="mt-3 text-lg">ToolHub brings the tools people usually hunt across five or six websites into one fast, private place — PDF and image utilities, developer helpers, converters, calculators, and a dedicated set for surveyors and engineers.</p>
      <h2>How it works</h2>
      <ul>
        <li><b>Instant tools</b> run as plain JavaScript in your browser — no files involved.</li>
        <li><b>In-browser tools</b> process your files on your own device using WebAssembly. They’re never uploaded.</li>
        <li><b>Server tools</b> (like Word to PDF or OCR) need native software, so files are sent over an encrypted connection, processed in an isolated worker, and deleted automatically within an hour.</li>
      </ul>
      <h2>Who it’s for</h2>
      <p>Everyone who needs a quick conversion — with extra depth for the Gulf and Pakistan: marla and kanal units, gratuity and zakat calculators, and local coordinate systems.</p>
      <p className="mt-6"><Link href="/tools" className="btn">Explore all tools</Link></p>
    </article>
  );
}
