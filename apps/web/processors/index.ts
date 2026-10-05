import type { ComponentType } from "react";
type Loader = () => Promise<{ default: ComponentType }>;

// Lazy-loaded tool UIs keyed by registry slug — heavy libs load only on the page that needs them.
export const components: Record<string, Loader> = {
  "word-counter": () => import("./text/word-counter"),
  "case-converter": () => import("./text/case-converter"),
  "json-formatter": () => import("./dev/json-formatter"),
  "base64": () => import("./dev/base64"),
  "qr-code-generator": () => import("./generator/qr"),
  "password-generator": () => import("./security/password"),
  "length-area-converter": () => import("./converter/length-area"),
  "percentage-calculator": () => import("./calc/percentage"),
  "dms-decimal": () => import("./survey/dms"),
  "merge-pdf": () => import("./pdf/merge"),
};
