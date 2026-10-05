"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Field } from "@/components/templates";
export default function QrGenerator() {
  const [text, setText] = useState("https://example.com");
  const [size, setSize] = useState(256);
  const [png, setPng] = useState("");
  useEffect(() => { if (text) QRCode.toDataURL(text, { width: size, margin: 2 }).then(setPng).catch(() => setPng("")); else setPng(""); }, [text, size]);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <Field label="Text or URL"><textarea className="input h-32" value={text} onChange={(e) => setText(e.target.value)} /></Field>
        <Field label={`Size: ${size}px`}><input type="range" min={128} max={1024} step={32} value={size} onChange={(e) => setSize(+e.target.value)} className="w-full" /></Field>
      </div>
      <div className="flex flex-col items-center gap-3">
        {png && <><img src={png} alt="QR code" width={Math.min(size, 320)} /><a className="btn" href={png} download="qr.png">Download PNG</a></>}
      </div>
    </div>
  );
}
