import type { Tool } from "../types";
import { mk } from "./helper";

const limits = { freeMB: 50, proMB: 500 }, pdf = [".pdf"];
const client = mk("pdf", "client", "file", 2), server = mk("pdf", "server", "file", 2), ai = mk("pdf", "ai", "file", 3);

/** PDF tools added after the first three phases. */
export const pdfExtra: Tool[] = [
  mk("pdf", "client", "editor", 1)("pdf-editor", "PDF Editor", "Edit text, annotate, sign, fill forms, redact, reorder pages and more — all in your browser", { accept: pdf, limits, wide: true, keywords: ["edit pdf", "annotate", "fill form", "pdf editor", "add text", "highlight"], related: ["sign-pdf", "redact-pdf", "merge-pdf", "compress-pdf"], isNew: true }),
  client("pdf-to-text", "PDF to Text", "Extract the text from a PDF", { accept: pdf, limits }),
  mk("pdf", "client", "text", 2)("text-to-pdf", "Text to PDF", "Turn plain text into a PDF", { limits }),
  client("edit-pdf-metadata", "Edit PDF Metadata", "Change title, author, subject and keywords", { accept: pdf, limits }),
  client("crop-pdf", "Crop PDF", "Trim margins from every page", { accept: pdf, limits }),
  client("flatten-pdf", "Flatten PDF", "Make form fields and annotations permanent", { accept: pdf, limits }),
  mk("pdf", "client", "editor", 2)("sign-pdf", "Sign PDF", "Draw or type your signature and place it on a page", { accept: pdf, limits }),
  mk("pdf", "client", "form", 3)("compare-pdf", "Compare PDFs", "See what changed between two PDF versions", { accept: pdf, limits }),
  client("redact-pdf", "Redact PDF", "Permanently black out words and phrases", { accept: pdf, limits }),
  server("grayscale-pdf", "Grayscale PDF", "Convert a colour PDF to black and white", { accept: pdf, limits }),
  ai("summarize-pdf", "Summarize PDF", "Get a clear AI summary of any PDF", { accept: pdf, limits: { freeMB: 20, proMB: 50 }, login: true, credits: 1, related: ["chat-with-pdf", "translate-pdf"] }),
  ai("chat-with-pdf", "Chat with PDF", "Ask questions and get answers from your PDF", { accept: pdf, limits: { freeMB: 20, proMB: 50 }, login: true, credits: 1, related: ["summarize-pdf"] }),
  ai("translate-pdf", "Translate PDF", "Translate a PDF’s text into another language", { accept: pdf, limits: { freeMB: 20, proMB: 50 }, login: true, credits: 3, related: ["summarize-pdf"] }),
];
