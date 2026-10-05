import type { ComponentType } from "react";
type Loader = () => Promise<{ default: ComponentType }>;
type Group = Promise<{ tools: Record<string, ComponentType> }>;

const from = (load: () => Group, key: string): Loader => async () => {
  const m = await load();
  if (!m.tools[key]) throw new Error(`No component registered for ${key}`);
  return { default: m.tools[key] };
};

// Lazy-loaded tool UIs keyed by registry slug — heavy libs load only on the page that needs them.
const groups: Record<string, () => Group> = {
  text: () => import("./text/basic"), dev: () => import("./dev/basic"), units: () => import("./converter/units"),
  calc: () => import("./calc/calculators"), security: () => import("./security/tools"),
  generator: () => import("./generator/extra"), pdf: () => import("./pdf/tools"), pdf2: () => import("./pdf/more"), image: () => import("./image/tools"),
  data: () => import("./data/tools"), video: () => import("./video/tools"), server: () => import("./server/tools"),
};
const map: [string, string[]][] = [
  ["text", ["remove-duplicate-lines", "sort-lines", "remove-extra-spaces", "text-diff", "find-replace", "lorem-ipsum"]],
  ["dev", ["json-csv", "json-yaml", "url-encode", "jwt-decoder", "regex-tester", "uuid-generator", "hash-generator", "timestamp-converter", "color-converter", "number-base"]],
  ["units", ["length-converter", "area-converter", "weight-converter", "temperature-converter", "volume-converter", "speed-converter", "data-storage-converter", "time-converter", "angle-converter"]],
  ["calc", ["percentage-calculator", "age-calculator", "date-difference", "loan-emi-calculator", "bmi-calculator", "discount-calculator", "vat-calculator", "zakat-calculator", "gratuity-calculator"]],
  ["security", ["password-strength", "file-hash"]],
  ["generator", ["qr-code-generator", "random-picker"]],
  ["pdf", ["merge-pdf", "split-pdf", "rotate-pdf", "delete-pdf-pages", "extract-pdf-pages", "organize-pdf", "pdf-watermark", "pdf-page-numbers", "pdf-to-jpg", "jpg-to-pdf"]],
  ["pdf2", ["pdf-to-text", "text-to-pdf", "edit-pdf-metadata", "crop-pdf", "flatten-pdf", "sign-pdf", "compare-pdf", "redact-pdf"]],
  ["image", ["compress-image", "resize-image", "crop-image", "rotate-image", "convert-image", "heic-to-jpg", "exif-remover"]],
  ["data", ["create-zip", "extract-zip", "csv-excel", "kml-csv"]],
  ["video", ["video-trim", "video-to-gif", "extract-audio"]],
  ["server", ["compress-pdf", "protect-pdf", "unlock-pdf", "repair-pdf", "ocr-pdf", "word-to-pdf", "excel-to-pdf", "powerpoint-to-pdf", "grayscale-pdf", "remove-background", "avif-convert", "video-convert", "video-compress", "audio-convert", "whats-my-ip", "dns-lookup", "ssl-checker", "http-headers-checker", "spf-dmarc-checker"]],
];

export const components: Record<string, Loader> = {
  "word-counter": () => import("./text/word-counter"),
  "case-converter": () => import("./text/case-converter"),
  "json-formatter": () => import("./dev/json-formatter"),
  "base64": () => import("./dev/base64"),
  "password-generator": () => import("./security/password"),
};
for (const [g, slugs] of map) for (const s of slugs) components[s] = from(groups[g], s);
