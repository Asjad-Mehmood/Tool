"use client";
import { useState, type ComponentType } from "react";
import { FileTool, Select, Field, type Output } from "@/components/templates";
import { convert, systemOptions } from "@/lib-geo";

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

function BatchCoords() {
  const [from, setFrom] = useState("EPSG:4326"), [to, setTo] = useState("UTM-40N"), [swap, setSwap] = useState(false);
  return <FileTool accept=".csv" actionLabel="Convert CSV"
    extra={<div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><Select label="From" value={from} onChange={setFrom} options={systemOptions} /><Select label="To" value={to} onChange={setTo} options={systemOptions} /></div>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={swap} onChange={(e) => setSwap(e.target.checked)} />First coordinate column is Y/Latitude/Northing (default: first = X/Longitude/Easting)</label>
      <Field label="CSV format"><p className="text-sm text-slate-500">Two numeric columns (X,Y) per row, optionally preceded by a name/ID column. A header row is detected automatically.</p></Field></div>}
    run={async ([f]) => {
      const Papa = (await import("papaparse")).default, rows = Papa.parse<string[]>(await f.text(), { skipEmptyLines: true }).data, out: string[][] = [];
      rows.forEach((r, i) => {
        const nums = r.map((c) => parseFloat(c)), idx = nums.map((n, k) => (Number.isFinite(n) ? k : -1)).filter((k) => k >= 0);
        if (idx.length < 2) { out.push(i === 0 ? [...r, "out_x", "out_y"] : [...r, "", ""]); return; }
        const [a, b] = [nums[idx[idx.length - 2]], nums[idx[idx.length - 1]]];
        try { const [x, y] = convert(from, to, swap ? b : a, swap ? a : b); out.push([...r, x.toFixed(to === "EPSG:4326" ? 8 : 3), y.toFixed(to === "EPSG:4326" ? 8 : 3)]); } catch { out.push([...r, "error", "error"]); }
      });
      return { blob: new Blob([Papa.unparse(out)], { type: "text/csv" }), name: `${base(f)}-converted.csv` };
    }} />;
}

export const tools: Record<string, ComponentType> = { "create-zip": CreateZip, "extract-zip": ExtractZip, "csv-excel": CsvExcel, "kml-csv": KmlCsv, "batch-coordinate-converter": BatchCoords };
