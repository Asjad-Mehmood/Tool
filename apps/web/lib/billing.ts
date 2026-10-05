import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { grantCredits } from "@/lib/credits";
import { planForVariant, variantFor, type CheckoutProduct } from "@/lib/plans";
import { SITE_URL } from "@/lib/site";
import type { Plan } from "@toolhub/db";

const API = "https://api.lemonsqueezy.com/v1";
export const billingConfigured = () => Boolean(process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID);

export async function createCheckout(user: { id: string; email: string }, product: CheckoutProduct): Promise<string> {
  const variant = variantFor(product);
  if (!billingConfigured() || !variant) throw new Error("Billing is not configured yet");
  const r = await fetch(`${API}/checkouts`, {
    method: "POST", signal: AbortSignal.timeout(10_000),
    headers: { Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json", Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}` },
    body: JSON.stringify({ data: { type: "checkouts", attributes: { checkout_data: { email: user.email, custom: { user_id: user.id } }, product_options: { redirect_url: `${SITE_URL}/dashboard?checkout=success` } }, relationships: { store: { data: { type: "stores", id: process.env.LEMONSQUEEZY_STORE_ID } }, variant: { data: { type: "variants", id: variant } } } } }),
  });
  const j = (await r.json().catch(() => ({}))) as { data?: { attributes?: { url?: string } } };
  if (!r.ok || !j.data?.attributes?.url) throw new Error("Could not start checkout");
  return j.data.attributes.url;
}

export function verifySignature(raw: string, header: string | null): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(header.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}

interface LsEvent {
  meta: { event_name: string; custom_data?: { user_id?: string } };
  data: { id: string; type: string; attributes: Record<string, unknown> & { status?: string; variant_id?: number; customer_id?: number; renews_at?: string | null; ends_at?: string | null; urls?: { customer_portal?: string }; user_email?: string; updated_at?: string; created_at?: string; first_order_item?: { variant_id?: number }; refunded?: boolean } };
}

const CREDIT_PACK = 100;
/** Whether a subscription status still grants paid access. */
export function entitled(status: string | undefined, endsAt: string | null | undefined, now = Date.now()) {
  if (status === "active" || status === "on_trial" || status === "past_due") return true;
  return status === "cancelled" && Boolean(endsAt) && new Date(endsAt!).getTime() > now;
}

/** Apply a verified Lemon Squeezy webhook. Safe to call twice with the same event. */
export async function handleWebhook(ev: LsEvent): Promise<string> {
  const { event_name: name } = ev.meta, a = ev.data.attributes;
  const eventId = `${name}:${ev.data.id}:${a.updated_at ?? a.created_at ?? ""}`;
  try { await db.webhookEvent.create({ data: { id: eventId } }); } catch (e) { if ((e as { code?: string }).code === "P2002") return "duplicate"; throw e; }

  const byId = ev.meta.custom_data?.user_id;
  const user = (byId ? await db.user.findUnique({ where: { id: byId } }) : null) ?? (a.user_email ? await db.user.findUnique({ where: { email: String(a.user_email).toLowerCase() } }) : null);
  if (!user) return "no-user";

  if (name.startsWith("subscription_") && ev.data.type === "subscriptions") {
    const variant = String(a.variant_id ?? ""), tier: Plan | null = planForVariant(variant), ok = entitled(a.status, a.ends_at);
    await db.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, provider: "lemonsqueezy", externalId: ev.data.id, customerId: String(a.customer_id ?? ""), variantId: variant, status: String(a.status), renewsAt: a.renews_at ? new Date(a.renews_at) : null, endsAt: a.ends_at ? new Date(a.ends_at) : null, portalUrl: a.urls?.customer_portal },
      update: { externalId: ev.data.id, customerId: String(a.customer_id ?? ""), variantId: variant, status: String(a.status), renewsAt: a.renews_at ? new Date(a.renews_at) : null, endsAt: a.ends_at ? new Date(a.ends_at) : null, portalUrl: a.urls?.customer_portal },
    });
    await db.user.update({ where: { id: user.id }, data: { plan: ok && tier ? tier : "FREE" } });
    return `subscription:${a.status}`;
  }
  if (name === "order_created" && ev.data.type === "orders" && a.status === "paid") {
    const variant = String(a.first_order_item?.variant_id ?? "");
    if (variant && variant === process.env.LS_VARIANT_CREDITS_100) { await grantCredits(user.id, CREDIT_PACK, "Credit pack purchase", `order:${ev.data.id}`); return "credits"; }
  }
  if (name === "order_refunded" && ev.data.type === "orders") {
    const variant = String(a.first_order_item?.variant_id ?? "");
    if (variant && variant === process.env.LS_VARIANT_CREDITS_100) { await grantCredits(user.id, -CREDIT_PACK, "Credit pack refunded", `refund:${ev.data.id}`); return "refund"; }
  }
  return "ignored";
}
