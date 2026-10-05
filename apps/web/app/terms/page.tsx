import type { Metadata } from "next";
export const metadata: Metadata = { title: "Terms of Use", description: "Terms for using ToolHub." };
export default function Terms() {
  return (
    <article className="prose-tool mx-auto max-w-3xl">
      <h1 className="text-4xl font-extrabold tracking-tight">Terms of Use</h1>
      <p className="mt-3">This is a plain-language placeholder — have it reviewed before launch.</p>
      <h2>Use of the service</h2><p>ToolHub is provided “as is” without warranties. AI-generated summaries, answers and translations can contain mistakes; verify anything important against the original document.</p>
      <h2>Acceptable use</h2><ul><li>Don’t upload content you have no right to process.</li><li>Don’t attempt to abuse, overload or probe the service or use it to attack others.</li><li>Don’t use unlock tools on files you aren’t authorised to open.</li></ul>
      <h2>Your content</h2><p>You keep ownership of your files. We process them only to provide the tool you chose and delete them automatically.</p>
    </article>
  );
}
