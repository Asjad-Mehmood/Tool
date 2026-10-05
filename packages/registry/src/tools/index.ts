import type { Tool } from "../types";
import { mk } from "./helper";

const text = mk("text", "instant", "text", 1);
const dev = mk("dev", "instant", "text", 1);
const form = (c: Parameters<typeof mk>[0]) => mk(c, "instant", "form", 1);
const file = (c: Parameters<typeof mk>[0], p: 1 | 2 | 3 = 1) => mk(c, "client", "file", p);
const server = (c: Parameters<typeof mk>[0], p: 1 | 2 | 3 = 1) => mk(c, "server", "file", p);
const net = mk("network", "server", "form", 2);
const limits = { freeMB: 50, proMB: 500 };
const pdf = [".pdf"], img = [".jpg", ".jpeg", ".png", ".webp"];

const conv = form("converter"), calc = form("calculator"), sec = form("security");
const pdfc = file("pdf"), imgc = file("image", 1), vid = file("video", 2);

export const catalogue: Tool[] = [
  // ---------- Phase 1: text ----------
  text("word-counter", "Word & Character Counter", "Count words, characters, sentences and reading time", { keywords: ["word count"], related: ["case-converter", "remove-duplicate-lines"] }),
  text("case-converter", "Case Converter", "UPPER, lower, Title, camelCase, snake_case and more", { related: ["word-counter"] }),
  text("remove-duplicate-lines", "Remove Duplicate Lines", "Delete repeated lines from a list", { related: ["sort-lines"] }),
  text("sort-lines", "Sort Lines", "Sort lines A–Z, Z–A, by length or randomly", { related: ["remove-duplicate-lines"] }),
  text("text-diff", "Text Diff Checker", "Compare two texts and see the differences", { ui: "form" }),
  text("find-replace", "Find & Replace", "Find and replace text, with regex support", { ui: "form" }),
  text("remove-extra-spaces", "Remove Extra Spaces & Line Breaks", "Clean up whitespace and blank lines"),
  text("lorem-ipsum", "Lorem Ipsum Generator", "Generate placeholder paragraphs", { ui: "form" }),

  // ---------- Phase 1: developer ----------
  dev("json-formatter", "JSON Formatter & Validator", "Format, minify and validate JSON", { related: ["json-csv", "json-yaml"] }),
  dev("json-csv", "JSON ↔ CSV", "Convert JSON arrays to CSV and back"),
  dev("json-yaml", "JSON ↔ YAML", "Convert between JSON and YAML"),
  dev("base64", "Base64 Encode / Decode", "Encode or decode Base64 text", { related: ["url-encode"] }),
  dev("url-encode", "URL Encode / Decode", "Percent-encode or decode URLs and query strings", { related: ["base64"] }),
  dev("jwt-decoder", "JWT Decoder", "Decode JSON Web Token header and payload"),
  mk("dev", "instant", "form", 1)("regex-tester", "Regex Tester", "Test regular expressions with live matches"),
  mk("dev", "instant", "form", 1)("uuid-generator", "UUID Generator", "Generate random v4 UUIDs"),
  dev("hash-generator", "Hash Generator", "MD5, SHA-1, SHA-256 and SHA-512 of text", { related: ["file-hash"] }),
  mk("dev", "instant", "form", 1)("timestamp-converter", "Unix Timestamp Converter", "Convert Unix time to dates and back"),
  mk("dev", "instant", "form", 1)("color-converter", "Color Converter", "Convert HEX, RGB and HSL colors"),
  mk("dev", "instant", "form", 1)("number-base", "Number Base Converter", "Binary, octal, decimal and hexadecimal"),

  // ---------- Phase 1: security ----------
  sec("password-generator", "Password Generator", "Generate strong random passwords", { related: ["password-strength"] }),
  sec("password-strength", "Password Strength Checker", "Estimate password strength privately in your browser", { related: ["password-generator"] }),
  file("security")("file-hash", "File Hash Checker", "Compute SHA-256/SHA-1/SHA-512 to verify downloads", { related: ["hash-generator"] }),

  // ---------- Phase 1: converters ----------
  conv("length-converter", "Length Converter", "Meters, feet, inches, miles, chains and more", { related: ["area-converter"] }),
  conv("area-converter", "Area Converter", "m², acre, hectare, marla, kanal and more", { keywords: ["marla", "kanal"], related: ["length-converter"] }),
  conv("weight-converter", "Weight Converter", "kg, lb, oz, tola, maund and more"),
  conv("temperature-converter", "Temperature Converter", "Celsius, Fahrenheit and Kelvin"),
  conv("volume-converter", "Volume Converter", "Litres, gallons, cubic metres and more"),
  conv("speed-converter", "Speed Converter", "km/h, mph, m/s and knots"),
  conv("data-storage-converter", "Data Storage Converter", "KB, MB, GB, TB (decimal and binary)"),
  conv("time-converter", "Time Converter", "Seconds to years and back"),
  conv("angle-converter", "Angle Converter", "Degrees, radians and gradians"),

  // ---------- Phase 1: calculators ----------
  calc("percentage-calculator", "Percentage Calculator", "Calculate percentages quickly"),
  calc("age-calculator", "Age Calculator", "Exact age in years, months and days"),
  calc("date-difference", "Date Difference Calculator", "Days between dates, or add days to a date"),
  calc("loan-emi-calculator", "Loan / EMI Calculator", "Monthly instalment, total interest and payment"),
  calc("bmi-calculator", "BMI Calculator", "Body mass index and category"),
  calc("discount-calculator", "Discount Calculator", "Sale price and savings"),
  calc("vat-calculator", "VAT / Sales Tax Calculator", "Add or remove VAT at any rate"),
  calc("zakat-calculator", "Zakat Calculator", "2.5% zakat on your zakatable wealth"),
  calc("gratuity-calculator", "End-of-Service Gratuity (UAE/Qatar/KSA)", "Estimate end-of-service gratuity — verify against current labour law"),


  // ---------- Phase 1: generators ----------
  form("generator")("qr-code-generator", "QR Code Generator", "Create QR codes for URLs, WiFi, WhatsApp and text"),
  form("generator")("random-picker", "Random Number & Name Picker", "Pick random numbers or names"),

  // ---------- Phase 2: PDF (client) ----------
  pdfc("merge-pdf", "Merge PDF", "Combine multiple PDFs into one file", { accept: pdf, multiple: true, limits, related: ["split-pdf"] }),
  pdfc("split-pdf", "Split PDF", "Split a PDF into single pages or ranges", { accept: pdf, limits }),
  pdfc("rotate-pdf", "Rotate PDF", "Rotate all or selected PDF pages", { accept: pdf, limits }),
  pdfc("delete-pdf-pages", "Delete PDF Pages", "Remove pages from a PDF", { accept: pdf, limits }),
  pdfc("extract-pdf-pages", "Extract PDF Pages", "Keep only the pages you need", { accept: pdf, limits }),
  pdfc("organize-pdf", "Organize PDF Pages", "Reorder PDF pages", { accept: pdf, limits }),
  pdfc("pdf-watermark", "Add Watermark to PDF", "Stamp text across PDF pages", { accept: pdf, limits }),
  pdfc("pdf-page-numbers", "Add Page Numbers to PDF", "Number every page of a PDF", { accept: pdf, limits }),
  pdfc("pdf-to-jpg", "PDF to JPG", "Render PDF pages as images", { accept: pdf, limits }),
  pdfc("jpg-to-pdf", "JPG / PNG to PDF", "Combine images into one PDF", { accept: img, multiple: true, limits }),

  // ---------- Phase 2: images (client) ----------
  imgc("compress-image", "Compress Image", "Reduce image file size", { accept: img, limits }),
  imgc("resize-image", "Resize Image", "Change image dimensions", { accept: img, limits }),
  imgc("crop-image", "Crop Image", "Crop an image to exact pixels", { accept: img, limits }),
  imgc("rotate-image", "Rotate & Flip Image", "Rotate or mirror an image", { accept: img, limits }),
  imgc("convert-image", "Convert JPG / PNG / WEBP", "Convert between image formats", { accept: img, limits }),
  imgc("heic-to-jpg", "HEIC to JPG", "Convert iPhone photos to JPG", { accept: [".heic", ".heif"], limits }),
  imgc("exif-remover", "EXIF Viewer & Remover", "See and strip photo metadata", { accept: img, limits }),

  // ---------- Phase 2: archive / data ----------
  file("archive")("create-zip", "Create ZIP", "Zip several files together", { multiple: true, limits }),
  file("archive")("extract-zip", "Extract ZIP", "Unzip an archive and download files", { accept: [".zip"], limits }),
  file("data")("csv-excel", "CSV ↔ Excel", "Convert CSV to XLSX and back", { accept: [".csv", ".xlsx", ".xls"], limits }),
  file("data")("kml-csv", "KML ↔ CSV / GeoJSON", "Extract points from KML/KMZ", { accept: [".kml", ".kmz"], limits }),

  // ---------- Phase 2: video (ffmpeg.wasm) ----------
  vid("video-trim", "Trim Video", "Cut a video between two times", { accept: [".mp4", ".mov", ".webm", ".mkv"], limits: { freeMB: 100, proMB: 500 } }),
  vid("video-to-gif", "Video to GIF", "Turn a short clip into a GIF", { accept: [".mp4", ".mov", ".webm"], limits: { freeMB: 100, proMB: 500 } }),
  vid("extract-audio", "Extract Audio from Video", "Pull an MP3 out of a video", { accept: [".mp4", ".mov", ".webm", ".mkv"], limits: { freeMB: 100, proMB: 500 } }),

  // ---------- Phase 3: server (worker) ----------
  server("pdf")("compress-pdf", "Compress PDF", "Shrink PDF size with Ghostscript", { accept: pdf, limits, options: [{ key: "quality", label: "Quality", type: "select", default: "ebook", choices: [{ value: "screen", label: "Smallest" }, { value: "ebook", label: "Balanced" }, { value: "printer", label: "High quality" }] }] }),
  server("pdf")("protect-pdf", "Protect PDF", "Add a password to a PDF", { accept: pdf, limits, options: [{ key: "password", label: "Password", type: "text", default: "" }] }),
  server("pdf")("unlock-pdf", "Unlock PDF", "Remove a password you already know", { accept: pdf, limits, options: [{ key: "password", label: "Current password", type: "text", default: "" }] }),
  server("pdf", 2)("repair-pdf", "Repair PDF", "Try to fix a damaged PDF", { accept: pdf, limits }),
  server("pdf", 2)("ocr-pdf", "OCR PDF", "Make a scanned PDF searchable", { accept: pdf, limits, options: [{ key: "lang", label: "Language", type: "select", default: "eng", choices: [{ value: "eng", label: "English" }, { value: "ara", label: "Arabic" }, { value: "urd", label: "Urdu" }] }] }),
  server("pdf")("word-to-pdf", "Word to PDF", "Convert DOC/DOCX to PDF", { accept: [".doc", ".docx"], limits }),
  server("pdf")("excel-to-pdf", "Excel to PDF", "Convert XLS/XLSX to PDF", { accept: [".xls", ".xlsx"], limits }),
  server("pdf")("powerpoint-to-pdf", "PowerPoint to PDF", "Convert PPT/PPTX to PDF", { accept: [".ppt", ".pptx"], limits }),
  server("image", 1)("remove-background", "Remove Background", "Cut out the subject of a photo", { accept: img, limits }),
  server("image", 2)("avif-convert", "Convert to AVIF", "Convert images to AVIF", { accept: img, limits }),
  server("video", 2)("video-convert", "Convert Video", "MP4, WEBM, MKV, MOV, AVI conversion", { accept: [".mp4", ".mov", ".webm", ".mkv", ".avi"], limits, options: [{ key: "format", label: "Format", type: "select", default: "mp4", choices: ["mp4", "webm", "mkv", "mov", "avi"].map((v) => ({ value: v, label: v.toUpperCase() })) }] }),
  server("video", 2)("video-compress", "Compress Video", "Reduce video size", { accept: [".mp4", ".mov", ".webm", ".mkv"], limits }),
  server("audio", 2)("audio-convert", "Convert Audio", "MP3, WAV, AAC, OGG, M4A conversion", { accept: [".mp3", ".wav", ".aac", ".ogg", ".m4a", ".flac"], limits, options: [{ key: "format", label: "Format", type: "select", default: "mp3", choices: ["mp3", "wav", "aac", "ogg", "m4a"].map((v) => ({ value: v, label: v.toUpperCase() })) }] }),

  net("whats-my-ip", "What's My IP", "See your public IP address", { priority: 1 }),
  net("dns-lookup", "DNS Lookup", "A, AAAA, MX, TXT, NS and CNAME records", { keywords: ["dns"] }),
  net("ssl-checker", "SSL Certificate Checker", "Check certificate issuer and expiry"),
  net("http-headers-checker", "HTTP Security Headers Checker", "Audit a site's security headers"),
  net("spf-dmarc-checker", "SPF / DMARC Checker", "Inspect email authentication records"),
];
