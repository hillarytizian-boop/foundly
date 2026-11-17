import { NextResponse } from "next/server";
import { adminClient } from "@/lib/tokens";
import { plan, act, summarise, type Goal } from "@/lib/milo/autonomy";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * The heartbeat. Called by Vercel Cron and, more often, by the app itself.
 *
 * WHY THERE ARE TWO TRIGGERS
 * This project is on Vercel's Hobby plan, which runs cron at most once per day
 * and only within a one-hour window. A product that only works once a day is not
 * autonomous in any sense a founder would recognise. So the same tick is also
 * fired opportunistically when the owner opens the app ("catch-up"), which is
 * the moment the work is guaranteed to be seen. Cron keeps it alive for people
 * who don't open the app; the visit makes it feel continuous.
 *
 * A run happens only when a goal is genuinely due, so a user refreshing the page
 * ten times does not trigger ten cycles.
 *
 * Auth: `CRON_SECRET` if set (Vercel sends it as a Bearer token). With the secret
 * unset, only the in-app trigger works, which calls this with the user's own
 * session cookie.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id");
  const force = url.searchParams.get("force") === "1";

  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  const fromCron = Boolean(secret) && auth === `Bearer ${secret}`;

  // An in-app catch-up is allowed only for the signed-in user themselves.
  let callerId: string | null = null;
  if (!fromCron) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    callerId = user?.id ?? null;
    if (!callerId) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
    if (userId && userId !== callerId) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const admin = adminClient();
  const targetUser = fromCron ? userId : callerId;

  const { data: autonomy } = await admin
    .from("milo_autonomy")
    .select("user_id,enabled")
    .eq("user_id", targetUser!)
    .maybeSingle();
  if (!autonomy?.enabled) return NextResponse.json({ ran: false, reason: "autonomy off" });

  const now = new Date().toISOString();
  let goalQuery = admin
    .from("milo_goals")
    .select("*")
    .eq("user_id", targetUser!)
    .eq("status", "active")
    .order("next_run_at", { ascending: true })
    .limit(1);
  if (!force) goalQuery = goalQuery.lte("next_run_at", now);

  const { data: goals } = await goalQuery;
  const goal = (goals ?? [])[0] as Goal | undefined;
  if (!goal) return NextResponse.json({ ran: false, reason: "nothing due" });

  // Claim the goal first: two ticks landing together must not both plan the
  // same cycle. The update is conditional on the goal still being due.
  const nextRun = new Date(Date.now() + Math.max(1, goal.cadence_hours) * 3600_000).toISOString();
  const { data: claimed } = await admin
    .from("milo_goals")
    .update({ next_run_at: nextRun, last_run_at: now, runs: (goal.runs ?? 0) + 1 })
    .eq("id", goal.id)
    .eq("status", "active")
    .select()
    .maybeSingle();
  if (!claimed) return NextResponse.json({ ran: false, reason: "already claimed" });

  const { data: run } = await admin
    .from("milo_runs")
    .insert({
      user_id: targetUser, goal_id: goal.id,
      trigger: fromCron ? "cron" : "catch-up",
      status: "running", steps: [],
    })
    .select()
    .single();

  // Fire and forget would lose the result on serverless; do the work inline.
  // Both phases are bounded (plan ≈ 1 model call, act ≈ 2-3 capabilities), so
  // this stays inside the function timeout.
  try {
    const planned = await plan(goal, targetUser!);
    const { steps, spent } = await act(goal, planned, targetUser!, () => {});
    const summary = summarise(planned, steps);

    await admin.from("milo_runs").update({
      steps: steps as any,
      summary,
      status: steps.every((s) => s.status === "failed") ? "failed" : "done",
      finished_at: new Date().toISOString(),
    }).eq("id", run!.id);

    await admin.from("milo_autonomy").update({
      last_run_at: new Date().toISOString(),
      last_run_status: summary,
    }).eq("user_id", targetUser!);

    return NextResponse.json({
      ran: true, goal: goal.goal, headline: planned.headline,
      engine: planned.engine, steps, spent, summary,
    });
  } catch (e: any) {
    await admin.from("milo_runs").update({
      status: "failed",
      summary: `Could not finish this cycle: ${e?.message ?? "unknown error"}`,
      finished_at: new Date().toISOString(),
    }).eq("id", run!.id);
    // Give the goal back so a transient failure doesn't push it out a full cycle.
    await admin.from("milo_goals").update({ next_run_at: now }).eq("id", goal.id);
    return NextResponse.json({ ran: false, error: e?.message ?? "run failed" }, { status: 500 });
  }
}
