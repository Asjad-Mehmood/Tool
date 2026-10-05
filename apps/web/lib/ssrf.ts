import dns from "node:dns";
import net from "node:net";
import http from "node:http";
import https from "node:https";
import tls from "node:tls";

// Block private, loopback, link-local (incl. cloud metadata 169.254.169.254), CGNAT, multicast and reserved ranges.
const blocked = new net.BlockList();
for (const [a, p] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]] as const) blocked.addSubnet(a, p, "ipv4");
for (const [a, p] of [["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["2001:db8::", 32], ["64:ff9b::", 96]] as const) blocked.addSubnet(a, p, "ipv6");

export function isBlockedIp(ip: string): boolean {
  const mapped = ip.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped IPv6
  if (mapped) ip = mapped[1];
  const fam = net.isIP(ip);
  if (!fam) return true;
  return blocked.check(ip, fam === 4 ? "ipv4" : "ipv6");
}

/** DNS lookup that refuses to resolve to a blocked address. Used at connect time, so it also defeats DNS rebinding. */
export const safeLookup: net.LookupFunction = (hostname, options, cb) => {
  dns.lookup(hostname, { ...options, all: true, verbatim: true }, (err, addrs) => {
    if (err) return cb(err, "", 4);
    const list = (Array.isArray(addrs) ? addrs : []) as dns.LookupAddress[];
    const ok = list.filter((a) => !isBlockedIp(a.address));
    if (!ok.length) return cb(Object.assign(new Error("Target address is not allowed"), { code: "EBLOCKED" }), "", 4);
    if ((options as dns.LookupOptions).all) return (cb as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, ok);
    cb(null, ok[0].address, ok[0].family);
  });
};

const HOST_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
export function parseHost(input: string): string {
  let h = input.trim().replace(/^[a-z]+:\/\//i, "").split(/[/?#]/)[0].replace(/:\d+$/, "").toLowerCase();
  if (net.isIP(h)) { if (isBlockedIp(h)) throw new Error("That address is not allowed"); return h; }
  if (!HOST_RE.test(h)) throw new Error("Enter a valid domain name, e.g. example.com");
  return h;
}

export function parseUrl(input: string): URL {
  const u = new URL(/^[a-z]+:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("Only http and https URLs are supported");
  if (u.username || u.password) throw new Error("URLs with credentials are not allowed");
  const port = u.port ? +u.port : u.protocol === "https:" ? 443 : 80;
  if (![80, 443, 8080, 8443].includes(port)) throw new Error("Port not allowed");
  parseHost(u.hostname);
  return u;
}

const MAX_REDIRECTS = 5, TIMEOUT_MS = 8000;
/** HEAD/GET following redirects manually, re-validating every hop. Returns headers only (body is discarded). */
export async function safeFetchHeaders(url: URL): Promise<{ chain: { url: string; status: number }[]; headers: http.IncomingHttpHeaders; finalUrl: string }> {
  const chain: { url: string; status: number }[] = [];
  let cur = url;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    parseUrl(cur.href);
    const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const lib = cur.protocol === "https:" ? https : http;
      const req = lib.request(cur, { method: "GET", lookup: safeLookup, timeout: TIMEOUT_MS, headers: { "user-agent": "ToolHub-Checker/1.0", accept: "*/*" } }, resolve);
      req.on("timeout", () => req.destroy(new Error("Request timed out"))); req.on("error", reject); req.end();
    });
    res.destroy(); // never download the body
    chain.push({ url: cur.href, status: res.statusCode ?? 0 });
    const loc = res.headers.location;
    if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && loc) { cur = new URL(loc, cur); continue; }
    return { chain, headers: res.headers, finalUrl: cur.href };
  }
  throw new Error("Too many redirects");
}

export function tlsInfo(host: string, port = 443): Promise<tls.PeerCertificate & { protocol: string | null; authorized: boolean; authError?: string }> {
  return new Promise((resolve, reject) => {
    const s = tls.connect({ host, port, servername: host, lookup: safeLookup, timeout: TIMEOUT_MS, rejectUnauthorized: false }, () => {
      const cert = s.getPeerCertificate(), out = { ...cert, protocol: s.getProtocol(), authorized: s.authorized, authError: s.authorizationError ? String(s.authorizationError) : undefined };
      s.end(); resolve(out);
    });
    s.on("timeout", () => { s.destroy(); reject(new Error("Connection timed out")); });
    s.on("error", reject);
  });
}
