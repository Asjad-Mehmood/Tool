"use client";
import { TextTool } from "@/components/templates";
const enc = (s: string) => { const b = new TextEncoder().encode(s); let r = ""; b.forEach((x) => (r += String.fromCharCode(x))); return btoa(r); };
const dec = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.trim()), (c) => c.charCodeAt(0)));
export default function Base64Tool() {
  return <TextTool actions={[{ id: "enc", label: "Encode" }, { id: "dec", label: "Decode" }]} transform={(s, a) => (!s ? "" : a === "dec" ? dec(s) : enc(s))} />;
}
