import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminClient } from "@/lib/tokens";

export const dynamic = "force-dynamic";

/**
 * A buyer, who is not a Foundly user, paying for a product on a public site.
 *
 * This is deliberately unauthenticated — the whole point is that a stranger can
 * buy. So it goes through the service role, and it does exactly one thing: take
 * a product id, look the price up in OUR database, and hand Stripe that price.
 *
 * The client never sends an amount. If it did, someone would eventually send $1
 * for a $400 product, and they would be right.
 */
export async function POST(req: Request) {
  // Two callers, one handler: the public page posts a plain HTML form (no JS —
  // the served site is sanitized and scripts are stripped), and the app posts
  // JSON. A form post must end in a redirect to Stripe, not JSON.
  const ctype = req.headers.get("content-type") ?? "";
  const isForm = ctype.includes("application/x-www-form-urlencoded") || ctype.includes("multipart/form-data");
  let product_id = "";
  let backTo = "/";
  if (isForm) {
    const fd = await req.formData();
    product_id = String(fd.get("product_id") ?? "");
    backTo = String(fd.get("back") ?? "/");
  } else {
    const j = await req.json().catch(() => ({}));
    product_id = String(j.product_id ?? "");
    backTo = String(j.back ?? "/");
  }
  if (!product_id) return NextResponse.json({ error: "product_id required" }, { status: 400 });

  if (!process.env.STRIPE_SECRET_KEY) {
    const msg = "Payments are not switched on for this site yet — the owner needs to add Stripe keys.";
    if (isForm) {
      return new Response(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Not available</title></head><body style="font-family:ui-sans-serif,system-ui,sans-serif;padding:40px;max-width:520px;margin:0 auto"><h1 style="font-size:20px">Checkout is not open</h1><p>${msg}</p><p><a href="${backTo}">Back to the site</a></p></body></html>`,
        { status: 503, headers: { "content-type": "text/html; charset=utf-8" } }
      );
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const admin = adminClient();
  const { data: product } = await admin
    .from("site_products")
    .select("id,name,description,price_cents,currency,active,site_id,user_id")
    .eq("id", product_id)
    .maybeSingle();

  if (!product || !(product as any).active) {
    return NextResponse.json({ error: "That product is no longer for sale." }, { status: 404 });
  }

  const p = product as any;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" as any });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://foundly-three.vercel.app";

  const { data: site } = await admin.from("sites").select("slug,business_name").eq("id", p.site_id).maybeSingle();
  const slug = (site as any)?.slug ?? "";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: p.currency,
          unit_amount: p.price_cents,   // from the database, never the browser
          product_data: {
            name: p.name,
            description: p.description ?? undefined,
          },
        },
      }],
      // Both ids travel with the payment so the webhook can attribute it
      // without trusting anything the buyer typed.
      client_reference_id: p.id,
      metadata: { product_id: p.id, site_id: p.site_id, owner_id: p.user_id, slug },
      success_url: `${appUrl}/s/${slug}?bought=1`,
      cancel_url: `${appUrl}${backTo.startsWith("/") ? backTo : "/"}?bought=0`,
    });

    // Record the attempt as pending. If the buyer abandons checkout it stays
    // pending forever and is never counted as revenue — only the webhook moves
    // a row to "paid".
    await admin.from("site_orders").insert({
      user_id: p.user_id,
      site_id: p.site_id,
      product_id: p.id,
      stripe_session_id: session.id,
      amount_cents: p.price_cents,
      currency: p.currency,
      status: "pending",
    });

    if (isForm) {
      // 303 so the browser follows with a GET and the form is not resubmitted.
      return NextResponse.redirect(session.url!, 303);
    }
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Checkout failed" }, { status: 502 });
  }
}
