import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createCheckout } from "@/lib/billing";
import type { CheckoutProduct } from "@/lib/plans";
import { clientIp, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";
const PRODUCTS: CheckoutProduct[] = ["pro_monthly", "pro_yearly", "team_monthly", "credits_100"];

export async function POST(req: Request) {
  if (await limited(`checkout:${clientIp(req)}`, 10, 60_000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first", code: "auth" }, { status: 401 });
  const product = ((await req.json().catch(() => ({}))) as { product?: CheckoutProduct }).product;
  if (!product || !PRODUCTS.includes(product)) return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  try { return NextResponse.json({ url: await createCheckout(user, product) }); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 503 }); }
}
