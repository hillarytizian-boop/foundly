import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminClient } from "@/lib/tokens";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook — the only place an order becomes "paid".
 *
 * Two different things arrive here and both matter:
 *   checkout.session.completed  → a customer bought something on a site
 *   the same event, credited    → a Foundly user topped up credits
 *
 * They are told apart by metadata: site purchases carry `product_id`, top-ups
 * carry `user_id` and no product. Previously this endpoint verified the
 * signature and then returned `{received:true}` without writing anything, so
 * every payment was silently dropped. That is fixed here.
 */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" as any });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = adminClient();

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const meta = (s.metadata ?? {}) as Record<string, string>;
      const paid = s.amount_total ?? 0;

      // ---- a customer bought a product on a site ----
      if (meta.product_id) {
        // The pending row was written when checkout started. Update by session
        // id so a retried webhook is idempotent rather than double-counted.
        const { data: existing } = await admin
          .from("site_orders")
          .select("id,status")
          .eq("stripe_session_id", s.id)
          .maybeSingle();

        if (!existing) {
          await admin.from("site_orders").insert({
            user_id: meta.owner_id,
            site_id: meta.site_id ?? null,
            product_id: meta.product_id,
            stripe_session_id: s.id,
            stripe_payment_intent: typeof s.payment_intent === "string" ? s.payment_intent : null,
            amount_cents: paid,
            currency: s.currency ?? "usd",
            status: "paid",
            buyer_email: s.customer_details?.email ?? null,
            paid_at: new Date().toISOString(),
          });
        } else if ((existing as any).status !== "paid") {
          await admin.from("site_orders").update({
            status: "paid",
            amount_cents: paid,
            buyer_email: s.customer_details?.email ?? null,
            stripe_payment_intent: typeof s.payment_intent === "string" ? s.payment_intent : null,
            paid_at: new Date().toISOString(),
          }).eq("id", (existing as any).id);
        }

        await admin.from("activity").insert({
          user_id: meta.owner_id,
          message: `Order paid: ${(paid / 100).toFixed(2)} ${(s.currency ?? "usd").toUpperCase()} — ${s.customer_details?.email ?? "a customer"}`,
        });

        // Money arriving is worth telling Milo about: the next cycle can act on it.
        if (meta.slug) {
          await admin.from("milo_messages").insert({
            user_id: meta.owner_id,
            role: "assistant",
            content: `You made a sale on /s/${meta.slug} — ${(paid / 100).toFixed(2)} ${(s.currency ?? "usd").toUpperCase()} from ${s.customer_details?.email ?? "a customer"}. I logged it in Orders.`,
          });
        }
      }

      // ---- a Foundly user topped up credits ----
      else if (meta.user_id) {
        await admin.from("payments").insert({
          user_id: meta.user_id,
          stripe_session_id: s.id,
          amount_cents: paid,
          currency: s.currency ?? "usd",
          status: "paid",
        });
        const { data: profile } = await admin.from("profiles").select("credits").eq("id", meta.user_id).maybeSingle();
        const current = (profile as any)?.credits ?? 0;
        // 100 credits per $10, rounded up so a partial pack is never zero.
        const granted = Math.max(1, Math.round(paid / 10));
        await admin.from("profiles").update({ credits: current + granted }).eq("id", meta.user_id);
        await admin.from("credit_events").insert({
          user_id: meta.user_id, delta: granted, reason: `Credit purchase (${(paid / 100).toFixed(2)} ${(s.currency ?? "usd").toUpperCase()})`,
        });
      }
    }

    if (event.type === "checkout.session.expired") {
      const s = event.data.object as Stripe.Checkout.Session;
      await admin.from("site_orders").update({ status: "failed" }).eq("stripe_session_id", s.id).eq("status", "pending");
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
      if (pi) await admin.from("site_orders").update({ status: "refunded" }).eq("stripe_payment_intent", pi);
    }
  } catch (e: any) {
    // Report to Stripe so it retries — a swallowed error here is a lost payment.
    return NextResponse.json({ error: e?.message ?? "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
