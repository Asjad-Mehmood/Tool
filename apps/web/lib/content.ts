import type { Tool } from "@toolhub/registry";

export function howTo(t: Tool): string[] {
  if (t.engine === "server") return ["Choose your file (it uploads over an encrypted connection).", "Adjust the options, then click Process on server.", "Wait a few seconds while it’s processed, then download the result. Your files are deleted automatically within 1 hour."];
  if (t.ui === "file") return ["Drop your file(s) into the box or click to browse — nothing is uploaded.", "Adjust the options below the file list if you need to.", "Click the action button, then download your result."];
  if (t.category === "network") return ["Enter a domain name (for example example.com).", "Click Check.", "Review the results below. Only public internet addresses can be checked."];
  if (t.ui === "text") return ["Paste or type your text into the left box.", "Pick an option if the tool offers several.", "Copy the result from the right box."];
  return ["Enter your values in the fields.", "The result updates instantly as you type.", "Copy or note the result — nothing is sent anywhere."];
}

export function faqs(t: Tool): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [{ q: `Is ${t.title} free?`, a: "Yes. ToolHub tools are free to use with no sign-up required." }];
  out.push(t.engine === "server"
    ? { q: "Are my files safe?", a: "Files are uploaded over an encrypted connection, processed in an isolated worker with no internet access, and deleted automatically within 1 hour. We never read or keep your content." }
    : { q: "Is my data uploaded anywhere?", a: "No. This tool runs entirely in your browser, so your files and text never leave your device." });
  if (t.accept) out.push({ q: "Which file types are supported?", a: `Supported: ${t.accept.join(", ")}.${t.limits ? ` Files up to ${t.limits.freeMB} MB are supported on the free plan.` : ""}` });
  if (t.category === "survey") out.push({ q: "How accurate are the results?", a: "Calculations use standard geodetic formulas (proj4 for projections; spherical formulas for lat/long bearings and distances). For legal or high-precision survey work, verify against your control network and the official parameters for your datum." });
  if (t.category === "converter" && t.slug === "area-converter") out.push({ q: "How big is a marla and a kanal?", a: "Using the Pakistani standard here: 1 marla = 272.25 sq ft (about 25.29 m²) and 1 kanal = 20 marla = 5,445 sq ft. Local definitions can differ slightly by region." });
  if (t.slug === "gratuity-calculator") out.push({ q: "Is this a legal calculation?", a: "No — it’s a simplified estimate. Labour laws and contracts differ and change; confirm with the current law and your employer." });
  if (t.slug === "zakat-calculator") out.push({ q: "What is nisab?", a: "Nisab is the minimum wealth above which zakat is due. Enter its current value in your currency, as it changes with gold and silver prices." });
  return out;
}
