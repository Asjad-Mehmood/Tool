import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "About", description: "Why ToolHub exists and how it works." };
export default function About() {
  return (
    <article className="prose-tool mx-auto max-w-3xl">
      <h1 className="text-4xl font-extrabold tracking-tight">About ToolHub</h1>
      <p className="mt-3 text-lg">ToolHub is a focused, private home for everything you do with PDFs: merge, split, compress, convert to and from Word, Excel, PowerPoint and images, sign, redact, protect — plus AI tools to summarize, translate and chat with a document.</p>
      <h2>How it works</h2>
      <ul>
        <li><b>In-browser tools</b> process your files on your own device using WebAssembly. They’re never uploaded.</li>
        <li><b>Server tools</b> (like Word to PDF or OCR) need native software, so files are sent over an encrypted connection, processed in an isolated worker, and deleted automatically within an hour.</li>
      </ul>
      <h2>AI tools</h2>
      <p>AI tools read your PDF in your browser and send only the extracted text to the AI service. The PDF file itself is never uploaded.</p>
      <h2>For developers</h2>
      <p>Pro and Team plans include a <Link href="/docs/api" className="underline">public API</Link> for the server-side tools.</p>
      <p className="mt-6"><Link href="/tools" className="btn">Explore all tools</Link></p>
    </article>
  );
}
