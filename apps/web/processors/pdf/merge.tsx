"use client";
import { FileTool } from "@/components/templates";
async function merge(files: File[]): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const out = await PDFDocument.create();
  for (const f of files) {
    const src = await PDFDocument.load(await f.arrayBuffer());
    (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
  }
  const bytes = await out.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
export default function MergePdf() {
  return <FileTool accept=".pdf,application/pdf" multiple actionLabel="Merge PDFs" run={(f) => (f.length < 2 ? Promise.reject(new Error("Add at least 2 PDFs")) : merge(f))} />;
}
