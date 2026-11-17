import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Goals are the things Milo works on by itself. Scoped by user.id via RLS + filter. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const [{ data: goals }, { data: autonomy }, { data: runs }] = await Promise.all([
    supabase.from("milo_goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("milo_autonomy").select("enabled,last_run_at,last_run_status").eq("user_id", user.id).maybeSingle(),
    supabase.from("milo_runs").select("id,goal_id,trigger,summary,status,started_at,finished_at,steps")
      .eq("user_id", user.id).order("started_at", { ascending: false }).limit(20),
  ]);

  return NextResponse.json({
    autonomy: autonomy ?? { enabled: false, last_run_at: null, last_run_status: null },
    goals: goals ?? [],
    runs: runs ?? [],
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // toggle autonomy
  if (body.op === "autonomy") {
    const { error } = await supabase.from("milo_autonomy").upsert({
      user_id: user.id,
      enabled: Boolean(body.enabled),
    }, { onConflict: "user_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, enabled: Boolean(body.enabled) });
  }

  // add a goal
  if (body.op === "add") {
    const goal = String(body.goal ?? "").trim();
    if (!goal) return NextResponse.json({ error: "Describe what Milo should work on" }, { status: 400 });
    const cadence = Math.min(168, Math.max(1, Number(body.cadence_hours) || 24));
    const { data, error } = await supabase.from("milo_goals").insert({
      user_id: user.id, goal: goal.slice(0, 300),
      why: body.why ? String(body.why).slice(0, 300) : null,
      cadence_hours: cadence,
      next_run_at: new Date().toISOString(),
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, goal: data });
  }

  // pause / resume / delete
  if (body.op === "status" || body.op === "delete") {
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    if (body.op === "delete") {
      await supabase.from("milo_goals").delete().eq("id", id).eq("user_id", user.id);
      return NextResponse.json({ ok: true, deleted: true });
    }
    const status = body.status === "active" ? "active" : "paused";
    const { error } = await supabase.from("milo_goals")
      .update({ status, ...(status === "active" ? { next_run_at: new Date().toISOString() } : {}) })
      .eq("id", id).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status });
  }

  return NextResponse.json({ error: `Unknown op: ${body.op}` }, { status: 400 });
}
