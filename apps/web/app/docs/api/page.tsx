import type { Metadata } from "next";
import Link from "next/link";
import { tools } from "@toolhub/registry";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = { title: "API documentation", description: "Compress, convert, protect and OCR PDFs from your own code with the ToolHub API." };

const Code = ({ children }: { children: string }) => <pre className="card overflow-x-auto bg-slate-900 !text-xs text-slate-100"><code>{children}</code></pre>;

export default function ApiDocs() {
  const list = tools.filter((t) => t.engine === "server" && t.ui === "file");
  return (
    <article className="prose-tool mx-auto max-w-3xl">
      <h1 className="text-4xl font-extrabold tracking-tight">ToolHub API</h1>
      <p className="mt-3 text-lg">Run our server-side PDF tools from your own code. Available on <Link className="underline" href="/pricing">Pro and Team</Link> plans.</p>

      <h2>Authentication</h2>
      <p>Create a key in your <Link className="underline" href="/dashboard">dashboard</Link> and send it as a bearer token. Keys are shown once and stored hashed.</p>
      <Code>{`Authorization: Bearer th_live_xxxxxxxxxxxxxxxxxxxxxxxx`}</Code>

      <h2>Quick start</h2>
      <p>Submit a file, then poll the job until it is <code>done</code> and download the result from the short-lived <code>downloadUrl</code>.</p>
      <Code>{`# 1. Submit
curl -X POST ${SITE_URL}/api/v1/compress-pdf \\
  -H "Authorization: Bearer $TOOLHUB_KEY" \\
  -F "file=@report.pdf" -F "quality=ebook"
# → { "id": "3f2c…", "status": "queued", "statusUrl": "${SITE_URL}/api/v1/jobs/3f2c…" }

# 2. Poll
curl ${SITE_URL}/api/v1/jobs/3f2c… -H "Authorization: Bearer $TOOLHUB_KEY"
# → { "status": "done", "downloadUrl": "https://…", "name": "compressed.pdf" }

# 3. Download (URL expires in 5 minutes)
curl -o compressed.pdf "<downloadUrl>"`}</Code>

      <h2>Endpoints</h2>
      <ul>
        <li><code>GET /api/v1/tools</code> — list tools, accepted file types, size limit for your plan and options.</li>
        <li><code>POST /api/v1/{"{tool}"}</code> — multipart upload: <code>file</code> (repeat for multi-file tools) plus option fields. Returns <code>202</code> with a job id.</li>
        <li><code>GET /api/v1/jobs/{"{id}"}</code> — <code>queued</code>, <code>processing</code>, <code>done</code> (with <code>downloadUrl</code>) or <code>failed</code> (with <code>error</code>). <code>410</code> once the job has expired.</li>
      </ul>

      <h2>Available tools</h2>
      <div className="card !p-0"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-2">Tool id</th><th>What it does</th><th>Options</th></tr></thead><tbody>
        {list.map((t) => <tr key={t.slug} className="border-t border-slate-200 align-top"><td className="px-4 py-2 font-mono text-xs">{t.slug}</td><td>{t.shortDesc}</td><td className="text-xs text-slate-500">{(t.options ?? []).map((o) => o.key + (o.choices ? ` (${o.choices.map((c) => c.value).join(" | ")})` : "")).join(", ") || "—"}</td></tr>)}
      </tbody></table></div>

      <h2>Limits</h2>
      <ul>
        <li>Pro: 1,000 requests per day · Team: 10,000 per day (UTC). Each submit and each status check counts as one request.</li>
        <li>60 requests per minute per key.</li>
        <li>File size up to the limit returned by <code>/api/v1/tools</code> (500 MB on paid plans).</li>
        <li>Inputs and results are deleted automatically after 1 hour.</li>
      </ul>

      <h2>Errors</h2>
      <p>Errors use standard HTTP status codes with a JSON body:</p>
      <Code>{`{ "error": { "code": "quota", "message": "Daily limit of 1000 API requests reached…" } }`}</Code>
      <p>Codes: <code>unauthorized</code> (401), <code>plan</code> (403), <code>unknown_tool</code> / <code>not_found</code> (404), <code>unsupported_type</code> / <code>bad_request</code> (400), <code>too_large</code> (413), <code>quota</code> / <code>rate_limited</code> (429).</p>
    </article>
  );
}
