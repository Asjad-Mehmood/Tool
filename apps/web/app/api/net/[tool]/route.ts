import { NextResponse } from "next/server";
import dns from "node:dns/promises";
import { clientIp, limited } from "@/lib/ratelimit";
import { parseHost, parseUrl, safeFetchHeaders, tlsInfo } from "@/lib/ssrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECURITY_HEADERS: { name: string; why: string }[] = [
  { name: "strict-transport-security", why: "Forces HTTPS" },
  { name: "content-security-policy", why: "Mitigates XSS and injection" },
  { name: "x-content-type-options", why: "Stops MIME sniffing (nosniff)" },
  { name: "x-frame-options", why: "Clickjacking protection (or CSP frame-ancestors)" },
  { name: "referrer-policy", why: "Limits referrer leakage" },
  { name: "permissions-policy", why: "Restricts browser features" },
  { name: "cross-origin-opener-policy", why: "Isolates browsing context" },
];

const txt = async (name: string) => { try { return (await dns.resolveTxt(name)).map((r) => r.join("")); } catch { return []; } };

async function handle(tool: string, input: string, req: Request) {
  switch (tool) {
    case "whats-my-ip": return { ip: clientIp(req) };
    case "dns-lookup": {
      const host = parseHost(input), out: Record<string, unknown> = { host };
      await Promise.all(["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA", "CAA"].map(async (t) => { try { out[t] = await dns.resolve(host, t); } catch { out[t] = []; } }));
      return out;
    }
    case "ssl-checker": {
      const host = parseHost(input), c = await tlsInfo(host), to = new Date(c.valid_to), days = Math.floor((+to - Date.now()) / 864e5);
      return { host, subject: c.subject, issuer: c.issuer, validFrom: c.valid_from, validTo: c.valid_to, daysRemaining: days, expired: days < 0, protocol: c.protocol, trusted: c.authorized, trustError: c.authError ?? null, altNames: c.subjectaltname ?? null, fingerprint256: c.fingerprint256 };
    }
    case "http-headers-checker": {
      const r = await safeFetchHeaders(parseUrl(input)), h = r.headers;
      const checks = SECURITY_HEADERS.map((s) => ({ header: s.name, present: Boolean(h[s.name]), value: h[s.name] ?? null, why: s.why }));
      return { finalUrl: r.finalUrl, redirects: r.chain, score: `${checks.filter((c) => c.present).length}/${checks.length}`, checks, server: h.server ?? null, poweredBy: h["x-powered-by"] ?? null };
    }
    case "spf-dmarc-checker": {
      const host = parseHost(input), [root, dmarc] = await Promise.all([txt(host), txt(`_dmarc.${host}`)]);
      const spf = root.filter((t) => t.toLowerCase().startsWith("v=spf1")), dm = dmarc.filter((t) => t.toLowerCase().startsWith("v=dmarc1"));
      const policy = dm[0]?.match(/\bp=(\w+)/i)?.[1] ?? null, all = spf[0]?.match(/([~\-+?]all)\b/)?.[1] ?? null;
      const issues: string[] = [];
      if (!spf.length) issues.push("No SPF record found"); if (spf.length > 1) issues.push("Multiple SPF records — only one is allowed");
      if (all === "+all" || all === "?all") issues.push(`SPF ends with ${all}, which allows anyone to send`);
      if (!dm.length) issues.push("No DMARC record found"); else if (policy === "none") issues.push("DMARC policy is p=none (monitoring only)");
      return { host, spf, dmarc: dm, dmarcPolicy: policy, spfAll: all, issues, verdict: issues.length ? "Needs attention" : "Looks good" };
    }
    default: return null;
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params, ip = clientIp(req);
  if (await limited(`net:${ip}`, 20, 60_000)) return NextResponse.json({ error: "Too many requests — try again in a minute" }, { status: 429 });
  let input = "";
  try { input = String(((await req.json().catch(() => ({}))) as { input?: string }).input ?? ""); } catch { /* empty */ }
  if (input.length > 300) return NextResponse.json({ error: "Input too long" }, { status: 400 });
  try {
    const data = await Promise.race([handle(tool, input, req), new Promise<never>((_, j) => setTimeout(() => j(new Error("Lookup timed out")), 15_000))]);
    if (data === null) return NextResponse.json({ error: "Unknown tool" }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    const code = (e as { code?: string }).code;
    const msg = code === "ENOTFOUND" ? "Domain not found" : code === "EBLOCKED" ? "That address is not allowed" : (e as Error).message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
