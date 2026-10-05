import type { Tool } from "@toolhub/registry";

export function howTo(t: Tool): string[] {
  if (t.engine === "ai") return ["Sign in (free) and drop your PDF — the text is extracted in your browser.", "Pick your options, then run the tool. Only the extracted text is sent to the AI.", "Read the result, copy it, or ask follow-up questions. Each run uses AI credits."];
  if (t.engine === "server") return ["Choose your PDF or document (it uploads over an encrypted connection).", "Adjust the options, then click Process on server.", "Wait a few seconds while it’s processed, then download the result. Your files are deleted automatically within 1 hour."];
  if (t.ui === "text") return ["Paste or type your text.", "Adjust the options if you need to.", "Click the action button and download your PDF."];
  return ["Drop your file(s) into the box or click to browse — nothing is uploaded.", "Adjust the options below the file list if you need to.", "Click the action button, then download your result."];
}

export function faqs(t: Tool): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [{ q: `Is ${t.title} free?`, a: t.engine === "ai" ? "A free account includes a few AI credits every month; more are available on Pro or as credit packs." : "Yes. The free plan covers this tool with no sign-up required." }];
  out.push(t.engine === "server"
    ? { q: "Are my files safe?", a: "Files are uploaded over an encrypted connection, processed in an isolated worker with no internet access, and deleted automatically within 1 hour. We never read or keep your content." }
    : t.engine === "ai"
      ? { q: "What gets sent to the AI?", a: "Your PDF is read in your browser and only its extracted text (plus your question or language choice) is sent for processing. The PDF file itself is never uploaded, and nothing is used to train models." }
      : { q: "Is my file uploaded anywhere?", a: "No. This tool runs entirely in your browser, so your PDF never leaves your device." });
  if (t.accept) out.push({ q: "Which file types are supported?", a: `Supported: ${t.accept.join(", ")}.${t.limits ? ` Files up to ${t.limits.freeMB} MB are supported on the free plan.` : ""}` });
  if (t.slug === "unlock-pdf") out.push({ q: "Can you remove a password I forgot?", a: "No. This tool only removes a password when you already know it. We don’t offer password cracking." });
  if (t.slug === "redact-pdf") out.push({ q: "Is the redaction permanent?", a: "Yes. Pages with matches are re-rendered as images with the matched text blacked out, so the hidden text can’t be copied or recovered. Pages without matches are left untouched." });
  if (t.slug === "compress-pdf") out.push({ q: "Will compression reduce quality?", a: "Balanced mode keeps text sharp and shrinks images. Choose “High quality” to keep more detail, or “Smallest” for the biggest savings." });
  if (t.slug === "ocr-pdf") out.push({ q: "Which languages does OCR support?", a: "English, Arabic and Urdu today. Results depend on scan quality." });
  if (t.slug === "sign-pdf") out.push({ q: "Is this a legally binding e-signature?", a: "It places an image of your signature on the page. Legal requirements for e-signatures vary by country and document type — check what yours needs." });
  return out;
}
