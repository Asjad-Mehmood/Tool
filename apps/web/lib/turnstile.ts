/** Cloudflare Turnstile. Enforced only when TURNSTILE_SECRET is set (and the visitor is anonymous). */
export const turnstileRequired = () => Boolean(process.env.TURNSTILE_SECRET);
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true;
  if (!token) return false;
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: new URLSearchParams({ secret, response: token, remoteip: ip }), signal: AbortSignal.timeout(5000) });
    return Boolean(((await r.json()) as { success?: boolean }).success);
  } catch { return false; }
}
