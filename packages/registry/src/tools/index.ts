import type { Tool } from "../types";

export const tools: Tool[] = [
  { slug: "word-counter", category: "text", title: "Word & Character Counter", shortDesc: "Count words, characters, sentences and reading time", engine: "instant", ui: "text", related: ["case-converter"], keywords: ["word count", "character count"], priority: 1 },
  { slug: "case-converter", category: "text", title: "Case Converter", shortDesc: "UPPER, lower, Title, camelCase, snake_case and more", engine: "instant", ui: "text", related: ["word-counter"], priority: 1 },
  { slug: "json-formatter", category: "dev", title: "JSON Formatter & Validator", shortDesc: "Format, minify and validate JSON", engine: "instant", ui: "text", related: ["base64"], priority: 1 },
  { slug: "base64", category: "dev", title: "Base64 Encode / Decode", shortDesc: "Encode or decode Base64 text", engine: "instant", ui: "text", related: ["json-formatter"], priority: 1 },
  { slug: "qr-code-generator", category: "generator", title: "QR Code Generator", shortDesc: "Create QR codes for URLs and text", engine: "instant", ui: "form", priority: 1 },
  { slug: "password-generator", category: "security", title: "Password Generator", shortDesc: "Generate strong random passwords", engine: "instant", ui: "form", priority: 1 },
  { slug: "length-area-converter", category: "converter", title: "Length & Area Converter", shortDesc: "Convert length and area, including marla and kanal", engine: "instant", ui: "form", keywords: ["marla", "kanal", "acre"], priority: 1 },
  { slug: "percentage-calculator", category: "calculator", title: "Percentage Calculator", shortDesc: "Calculate percentages quickly", engine: "instant", ui: "form", priority: 1 },
  { slug: "dms-decimal", category: "survey", title: "DMS ↔ Decimal Degrees", shortDesc: "Convert degrees-minutes-seconds and decimal degrees", engine: "instant", ui: "form", priority: 1 },
  { slug: "merge-pdf", category: "pdf", title: "Merge PDF", shortDesc: "Combine multiple PDFs into one file", engine: "client", ui: "file", accept: [".pdf"], multiple: true, limits: { freeMB: 50, proMB: 500 }, related: ["split-pdf"], priority: 1 },
];
