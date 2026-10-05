import type { Metadata } from "next";
export const metadata: Metadata = { title: "Security & Privacy", description: "How ToolHub protects your files and data." };
const S = ({ t, children }: { t: string; children: React.ReactNode }) => <><h2>{t}</h2>{children}</>;
export default function Privacy() {
  return (
    <article className="prose-tool mx-auto max-w-3xl">
      <h1 className="text-4xl font-extrabold tracking-tight">Security &amp; Privacy</h1>
      <p className="mt-3 text-lg">Privacy is the default: if a tool can run in your browser, it does.</p>
      <S t="Tools that run in your browser"><p>Most PDF tools — merge, split, rotate, sign, redact, watermark and more — run locally. Your files and text never leave your device.</p></S>
      <S t="Tools that run on our servers">
        <ul>
          <li>Files are uploaded over HTTPS directly to private storage using short-lived, single-use links.</li>
          <li>File types are verified by their contents, not just the extension, and size limits are enforced.</li>
          <li>Processing happens in a locked-down container: non-root, read-only filesystem, resource and time limits, and no outbound internet access.</li>
          <li>Inputs and results are deleted automatically within 1 hour. We don’t read, sell or keep your content.</li>
        </ul>
      </S>
      <S t="AI tools"><p>Text is extracted from your PDF in your browser. Only that text (and your question or language choice) is sent to the AI provider to produce the result; the PDF itself is never uploaded. We do not store the text or the answers, and they are not used to train models.</p></S>
      <S t="Accounts and payments"><p>If you sign in we store your email address, plan and usage counts. Payments are handled by our payment provider; we never see your card details. API keys are stored only as hashes.</p></S>
      <S t="Data we collect"><p>We don’t log file contents. Rate limiting uses your IP address transiently to prevent abuse. The “recently used” list on the home page is stored only in your browser. Ads (free plan only) may use cookies set by the ad provider. Analytics, if enabled, will be privacy-friendly and cookie-free.</p></S>
      <S t="Report a vulnerability"><p>If you find a security issue, please report it responsibly to the site owner before disclosing it publicly.</p></S>
    </article>
  );
}
