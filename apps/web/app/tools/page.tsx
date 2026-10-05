import type { Metadata } from "next";
import ToolsDirectory from "@/components/ToolsDirectory";
export const metadata: Metadata = { title: "All Tools", description: "Browse every ToolHub tool — PDF, image, video, developer, security, converters, calculators and survey tools." };
export default function ToolsPage() {
  return (<div><h1 className="text-3xl font-extrabold tracking-tight">All tools</h1><p className="mb-6 mt-1 text-slate-600">Search and filter the full catalogue.</p><ToolsDirectory /></div>);
}
