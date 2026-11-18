import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parsePrice } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/**
 * Products on a site.
 *
 * A site with no way to take money is a brochure. These rows are what the
 * public page turns into Buy buttons, and what the Stripe checkout prices.
 *
 * Prices are integer minor units end to end. `price` (a human string like
 * "$45 a set") is parsed once, here, and the parsed integer is what Stripe
 * charges — so the page and the receipt cannot drift apart.
 */

export async function GET(req: Request) {
  const siteId = new URL(req.url).searchParams.get("site_id");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  let q = supabase.from("site_products").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
  if (siteId) q = q.eq("site_id", siteId);
  const { data } = await q;
  return NextResponse.json({ products: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  if (body.op === "delete") {
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await supabase.from("site_products").delete().eq("id", id).eq("user_id", user.id);
    return NextResponse.json({ ok: true });
  }

  const siteId = String(body.site_id ?? "");
  if (!siteId) return NextResponse.json({ error: "Pick a site first" }, { status: 400 });

  // The site must be ours — RLS enforces it, but check so the error is a
  // sentence rather than an empty row count.
  const { data: site } = await supabase.from("sites").select("id").eq("id", siteId).eq("user_id", user.id).maybeSingle();
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Give the product a name" }, { status: 400 });

  // Either an explicit amount, or a human price string we can parse.
  let price = null as { cents: number; currency: string } | null;
  if (body.price_cents !== undefined) {
    const cents = Math.round(Number(body.price_cents));
    if (Number.isFinite(cents) && cents >= 50) price = { cents, currency: String(body.currency ?? "usd").toLowerCase() };
  }
  if (!price) price = parsePrice(String(body.price ?? ""));
  if (!price) {
    return NextResponse.json({
      error: "I need a real price — something like \"$45\" or \"KSh 2,500\". Stripe's minimum is about 50 cents.",
    }, { status: 400 });
  }

  const { data, error } = await supabase.from("site_products").insert({
    site_id: siteId,
    user_id: user.id,
    name: name.slice(0, 140),
    description: String(body.description ?? "").slice(0, 600) || null,
    price_cents: price.cents,
    currency: price.currency,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, product: data });
}
