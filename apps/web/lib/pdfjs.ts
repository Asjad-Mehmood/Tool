/** pdf.js loaded lazily from the legacy build (works on older browsers). Browser-only. */
export async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs;
}

/** Extract text page by page, entirely in the browser. */
export async function extractPages(file: File, onPage?: (n: number, total: number) => void): Promise<string[]> {
  const pdfjs = await getPdfjs(), doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise, pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onPage?.(i, doc.numPages);
    const tc = await (await doc.getPage(i)).getTextContent();
    let t = "";
    for (const it of tc.items) { if ("str" in it) { t += it.str; t += it.hasEOL ? "\n" : " "; } }
    pages.push(t.replace(/[ \t]+\n/g, "\n").replace(/ {2,}/g, " ").trim());
  }
  return pages;
}
