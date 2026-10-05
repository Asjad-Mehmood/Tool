"use client";
import { useState, type ComponentType } from "react";
import { FileTool, Select, type Output } from "@/components/templates";

const base = (f: File) => f.name.replace(/\.[^.]+$/, "");

function CreateZip() {
  return <FileTool multiple actionLabel="Create ZIP" run={async (files) => {
    const { default: JSZip } = await import("jszip"), z = new JSZip();
    files.forEach((f) => z.file(f.name, f));
    return { blob: await z.generateAsync({ type: "blob", compression: "DEFLATE" }), name: "archive.zip" };
  }} />;
}

const MAX_UNZIPPED = 1024 ** 3; // 1 GB total — zip-bomb guard
function ExtractZip() {
  return <FileTool accept=".zip" actionLabel="Extract" run={async ([f]) => {
    const { default: JSZip } = await import("jszip"), z = await JSZip.loadAsync(f), entries = Object.values(z.files).filter((e) => !e.dir);
    const total = entries.reduce((s, e) => s + ((e as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0), 0);
    if (total > MAX_UNZIPPED) throw new Error("Archive expands to more than 1 GB — refusing to extract");
    if (entries.length > 2000) throw new Error("Too many files in archive");
    return Promise.all(entries.map(async (e): Promise<Output> => ({ blob: await e.async("blob"), name: e.name.replace(/[\\/]+/g, "_").replace(/^\.+/, "") })));
  }} />;
}

function CsvExcel() {
  return <FileTool accept=".csv,.xlsx,.xls" actionLabel="Convert" run={async ([f]) => {
    const XLSX = await import("xlsx");
    if (/\.csv$/i.test(f.name)) { const wb = XLSX.read(await f.text(), { type: "string" }); return { blob: new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }), name: `${base(f)}.xlsx` }; }
    const wb = XLSX.read(await f.arrayBuffer()); return { blob: new Blob([XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]])], { type: "text/csv" }), name: `${base(f)}.csv` };
  }} />;
}

function KmlCsv() {
  const [fmt, setFmt] = useState("csv");
  return <FileTool accept=".kml,.kmz" actionLabel="Convert" extra={<Select label="Output" value={fmt} onChange={setFmt} options={[{ value: "csv", label: "CSV (name, lat, lon)" }, { value: "geojson", label: "GeoJSON" }]} />}
    run={async ([f]) => {
      const { kml } = await import("@tmcw/togeojson");
      let text: string;
      if (/\.kmz$/i.test(f.name)) { const { default: JSZip } = await import("jszip"), z = await JSZip.loadAsync(f), e = Object.values(z.files).find((x) => /\.kml$/i.test(x.name)); if (!e) throw new Error("No KML inside KMZ"); text = await e.async("string"); } else text = await f.text();
      const gj = kml(new DOMParser().parseFromString(text, "text/xml"));
      if (fmt === "geojson") return { blob: new Blob([JSON.stringify(gj, null, 2)], { type: "application/geo+json" }), name: `${base(f)}.geojson` };
      const rows = ["name,type,latitude,longitude"];
      for (const ft of gj.features) { const g = ft.geometry; if (!g) continue; const name = JSON.stringify(String(ft.properties?.name ?? "")), pts: number[][] = g.type === "Point" ? [g.coordinates] : g.type === "LineString" ? g.coordinates : g.type === "Polygon" ? g.coordinates[0] : []; pts.forEach((p) => rows.push(`${name},${g.type},${p[1]},${p[0]}`)); }
      return { blob: new Blob([rows.join("\n")], { type: "text/csv" }), name: `${base(f)}.csv` };
    }} />;
}

export const tools: Record<string, ComponentType> = { "create-zip": CreateZip, "extract-zip": ExtractZip, "csv-excel": CsvExcel, "kml-csv": KmlCsv };
