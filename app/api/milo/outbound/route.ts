import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claim, finish, sentToday, releaseFor, DAILY_SEND_CAP, AUTO_COOL_DOWN_MINUTES } from "@/lib/milo/outbound";
import { deliver } from "@/lib/milo/deliver";
import { adminClient } from "@/lib/tokens";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** The account's release settings, in one shape the UI and the releaser share. */
async function settings(supabase: any, userId: string) {
  const { data } = await supabase
    .from("milo_autonomy")
    .select("enabled,auto_publish,auto_send,send_cap_per_day,risk_ack_at")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    enabled: Boolean((data as any)?.enabled),
    auto_publish: Boolean((data as any)?.auto_publish),
    auto_send: Boolean((data as any)?.auto_send),
    send_cap_per_day: (data as any)?.send_cap_per_day ?? 3,
    risk_ack_at: (data as any)?.risk_ack_at ?? null,
  };
}

/**
 * GET — what is waiting, what went out, and whether auto-send is on.
 *
 * Deliberately returns the cap arithmetic too: "2 of 3 sent today" is the only
 * way a user can tell the difference between "it is quiet" and "it is capped".
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const [{ data: held }, { data: recent }, s, sent] = await Promise.all([
    supabase.from("outbound_queue").select("*").eq("user_id", user.id).eq("status", "held")
      .order("created_at", { ascending: false }).limit(50),
    supabase.from("outbound_queue").select("*").eq("user_id", user.id)
      .in("status", ["sent", "failed", "cancelled", "skipped"])
      .order("created_at", { ascending: false }).limit(30),
    settings(supabase, user.id),
    sentToday(user.id),
  ]);

  return NextResponse.json({
    settings: s,
    held: held ?? [],
    recent: recent ?? [],
    today: { sent, cap: Math.min(s.send_cap_per_day, DAILY_SEND_CAP), hard_cap: DAILY_SEND_CAP },
    cool_down_minutes: AUTO_COOL_DOWN_MINUTES,
  });
}

/**
 * POST — either flip a setting, approve/cancel an item, or release what is due.
 *
 * `op: "release"` is what the autonomy tick calls. It is idempotent-by-claim:
 * an item can only move held → releasing once, so two ticks cannot double-send.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // ---- flip a setting ----
  if (body.op === "settings") {
    const patch: Record<string, unknown> = { user_id: user.id };

    if (body.auto_publish !== undefined) patch.auto_publish = Boolean(body.auto_publish);
    if (body.auto_send !== undefined) {
      const on = Boolean(body.auto_send);
      if (on) {
        // Refuse to turn auto-send on with nothing to send through. A toggle
        // that can be on while every send fails is worse than no toggle.
        const { data: tokens } = await supabase.from("integration_tokens").select("slug").eq("user_id", user.id);
        const channels = (tokens ?? []).map((t: any) => t.slug);
        if (!channels.length) {
          return NextResponse.json({
            error: "Connect at least one channel first (X, Gmail, Instagram…). Auto-send with nothing connected would just fail quietly.",
            needs_connect: true,
          }, { status: 400 });
        }
        patch.risk_ack_at = new Date().toISOString();
      }
      patch.auto_send = on;
    }
    if (body.send_cap_per_day !== undefined) {
      patch.send_cap_per_day = Math.min(DAILY_SEND_CAP, Math.max(1, Number(body.send_cap_per_day) || 3));
    }

    const { error } = await supabase.from("milo_autonomy").upsert(patch, { onConflict: "user_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, settings: await settings(supabase, user.id) });
  }

  // ---- approve or cancel one held item ----
  if (body.op === "approve" || body.op === "cancel") {
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { data: row } = await supabase.from("outbound_queue").select("*").eq("id", id).maybeSingle();
    if (!row || (row as any).user_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if ((row as any).status !== "held") return NextResponse.json({ error: "This one has already moved." }, { status: 409 });

    if (body.op === "cancel") {
      await supabase.from("outbound_queue").update({ status: "cancelled" }).eq("id", id);
      return NextResponse.json({ ok: true, status: "cancelled" });
    }

    // Approve = send now, and report the provider's own words if it refuses.
    const admin = adminClient();
    const claimed = await claim(id);
    if (!claimed) return NextResponse.json({ error: "Someone else is sending this one." }, { status: 409 });
    const result = await deliver(claimed);
    await finish(id, result.ok ? "sent" : "failed", result.error);
    return NextResponse.json({
      ok: result.ok,
      status: result.ok ? "sent" : "failed",
      url: result.url ?? null,
      error: result.ok ? null : result.error,
    }, { status: result.ok ? 200 : 502 });
  }

  // ---- release everything that is due (called by the autonomy tick) ----
  if (body.op === "release") {
    const s = await settings(supabase, user.id);
    const out = await releaseFor(user.id, deliver, { cap: s.send_cap_per_day, autoSend: s.auto_send });
    return NextResponse.json({ ok: true, ...out, today: { sent: await sentToday(user.id), cap: Math.min(s.send_cap_per_day, DAILY_SEND_CAP) } });
  }

  return NextResponse.json({ error: "Unknown op" }, { status: 400 });
}
