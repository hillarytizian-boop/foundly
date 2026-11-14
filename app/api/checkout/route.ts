import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    // A checkout session must belong to a known account, otherwise the webhook
    // has no one to credit and the payment is orphaned.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
      return NextResponse.json({ error: "Stripe not configured. Add STRIPE_SECRET_KEY + STRIPE_PRICE_ID to .env.local" }, { status: 400 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" as any });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      success_url: `${appUrl}/line?paid=1`,
      cancel_url: `${appUrl}/line?paid=0`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Checkout failed" }, { status: 500 });
  }
}
