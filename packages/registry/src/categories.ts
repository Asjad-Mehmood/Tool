import type { Category } from "./types";
export const categories: Category[] = [
  { id: "pdf", title: "PDF Tools", icon: "📄", desc: "Merge, split and edit PDFs" },
  { id: "image", title: "Image Tools", icon: "🖼️", desc: "Compress, resize, convert" },
  { id: "text", title: "Text Tools", icon: "✍️", desc: "Count, convert and clean text" },
  { id: "dev", title: "Developer Tools", icon: "💻", desc: "Format, encode and decode" },
  { id: "security", title: "Security", icon: "🔐", desc: "Passwords, hashes, checks" },
  { id: "converter", title: "Unit Converters", icon: "📏", desc: "Length, area, weight and more" },
  { id: "calculator", title: "Calculators", icon: "🧮", desc: "Percentage, loan, age" },
  { id: "survey", title: "Survey & Engineering", icon: "📐", desc: "Coordinates, bearings, areas" },
  { id: "generator", title: "Generators", icon: "⚙️", desc: "QR codes and more" },
];
