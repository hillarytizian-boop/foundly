import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The owner's orders.
 *
 * RLS means this can only ever return the signed-in user's own rows, so there
 * is no filter to forget. Pending checkouts are included but flagged, because
 * "someone started checkout and left" is useful information — it usually means
 * the price or the page is the problem, not the traffic.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const { data, error } = await supabase
    .from("site_orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message, orders: [] }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}
