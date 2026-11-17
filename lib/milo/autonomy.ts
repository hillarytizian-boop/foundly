// Autonomy: Milo works when nobody is watching.
//
// The loop is deliberately split in two, because the two halves have different
// risk profiles:
//
//   plan()  — free. One model call that decides what to do next. It reads the
//             goal, what has already been done, and the account, and returns a
//             small plan. Nothing is written, nothing is spent.
//   act()   — costs credits. Executes the plan through the SAME capabilities a
//             human would trigger from Run, so approval-gated work still stops
//             for approval and credits are still deducted.
//
// Two invariants make this safe to leave running:
//   1. Milo only does what it can't undo, or what the user approved. Anything
//      that leaves Foundly (a post, an email) is created as needs_approval and
//      waits. The user can grant autonomous sending per-goal later; until then
//      the default is "do the work, ask before it leaves".
//   2. Every run has a credit budget. A loop that can drain an account is not
//      autonomy, it's a bug.

import { adminClient } from "@/lib/tokens";
import { nvidiaChat, extractJson, isConfigured } from "@/lib/nvidia";
import { getCapability, CAPABILITIES } from "@/lib/capabilities";
import { runCapability } from "@/lib/engine";

export type Goal = {
  id: string;
  user_id: string;
  goal: string;
  why: string | null;
  cadence_hours: number;
  status: string;
  next_run_at: string;
  last_run_at: string | null;
  runs: number;
};

export type PlanStep = {
  /** capability kind, or "publish_site" / "note" */
  action: string;
  title: string;
  /** why this step, in Milo's voice — shown in the feed */
  reason: string;
  inputs?: Record<string, string>;
};

export type Plan = {
  headline: string;
  steps: PlanStep[];
  engine: "live" | "rules";
  budget: number;
};

export type RunStep = {
  label: string;
  detail?: string;
  status: "running" | "done" | "failed" | "waiting";
  ms?: number;
  link?: { label: string; href: string };
};

/** Never let one autonomous run cost more than this, regardless of the plan. */
export const RUN_BUDGET = 6;

type Snapshot = {
  businessName: string | null;
  credits: number;
  openGoals: number;
  doneTasks: string[];
  siteCount: number;
  publishedUrl: string | null;
  connected: string[];
};

async function snapshot(userId: string, goal: Goal): Promise<Snapshot> {
  const admin = adminClient();
  const [{ data: profile }, { data: tasks }, { data: sites }, { data: integrations }] = await Promise.all([
    admin.from("profiles").select("credits,business_name").eq("id", userId).maybeSingle(),
    admin.from("tasks").select("title,kind,status").eq("user_id", userId).order("created_at", { ascending: false }).limit(12),
    admin.from("sites").select("slug,published").eq("user_id", userId).limit(10),
    admin.from("integration_tokens").select("slug").eq("user_id", userId),
  ]);
  const published = (sites ?? []).find((s: any) => s.published);
  return {
    businessName: (profile as any)?.business_name ?? null,
    credits: (profile as any)?.credits ?? 0,
    openGoals: 0,
    doneTasks: (tasks ?? []).filter((t: any) => t.status === "done").map((t: any) => t.title),
    siteCount: (sites ?? []).length,
    publishedUrl: published ? `/s/${published.slug}` : null,
    connected: (integrations ?? []).map((i: any) => i.slug),
  };
}

/**
 * Decide what to do next. Free — one model call, no writes, no credits.
 *
 * If the model is unavailable this falls back to a rules-based plan that is
 * boring but correct: it works down the checklist a new business actually
 * needs, skipping anything already done.
 */
export async function plan(goal: Goal, userId: string): Promise<Plan> {
  const snap = await snapshot(userId, goal);

  if (!isConfigured()) return rulesPlan(goal, snap);

  const allowed = ["research.market", "plan.business", "doc.catalogue", "outreach.draft",
    "social.draft", "leads.find", "support.faq", "report.weekly", "brand.name", "idea.validate"];

  const menu = CAPABILITIES.filter((c) => allowed.includes(c.kind))
    .map((c) => `${c.kind} (${c.credits} credits) — ${c.blurb}${c.approval ? " [needs approval]" : ""}`);

  const res = await nvidiaChat({
    messages: [
      {
        role: "system",
        content:
          `You are Milo, an AI employee that runs a small business while the owner sleeps.
You are planning ONE work cycle, not chatting. Choose 2-3 concrete jobs from the menu below.

Available jobs:
${menu.join("\n")}

Rules:
- Do not repeat work already done (listed below). Build on it instead.
- Prefer jobs that unblock the next stage: research before planning, catalogue before outreach.
- Anything marked [needs approval] is fine to do — it will wait for the owner's OK before sending.
- BUDGET: the credit costs of your chosen steps must add up to ${RUN_BUDGET} or less.
  Two jobs are normal. Never plan three expensive jobs; the third would be skipped.
- Reply with JSON only, no prose, no fences: {"headline":"one line, what this cycle is about","steps":[{"action":"<kind>","title":"short title","reason":"one sentence","inputs":{"<key>":"<value>"}}]}
- inputs must match the job's needs. Keep values short and concrete.`,
      },
      {
        role: "user",
        content:
          `GOAL: ${goal.goal}\n` +
          (goal.why ? `WHY IT MATTERS: ${goal.why}\n` : "") +
          `BUSINESS: ${snap.businessName ?? "unnamed"}\n` +
          `STATUS: ${snap.siteCount} site(s)${snap.publishedUrl ? `, live at ${snap.publishedUrl}` : ", none published"}; ` +
          `connected tools: ${snap.connected.join(", ") || "none"}; ${snap.credits} credits\n` +
          `ALREADY DONE: ${snap.doneTasks.slice(0, 8).join("; ") || "nothing yet"}\n` +
          `Cycle number: ${goal.runs + 1}.`,
      },
    ],
    maxTokens: 700,
    temperature: 0.4,
    reasoningEffort: "low",
    timeoutMs: 60_000,
    json: true,
  });

  if (!res.ok) return rulesPlan(goal, snap);

  const parsed = extractJson<{ headline?: string; steps?: PlanStep[] }>(res.text);
  const steps = (parsed?.steps ?? []).filter(
    (s) => s && typeof s.action === "string" && getCapability(s.action)
  ).slice(0, 3);

  if (!steps.length) return rulesPlan(goal, snap);

  return {
    headline: parsed?.headline?.trim() || `Working on: ${goal.goal}`,
    steps: steps.map((s) => ({
      action: s.action,
      title: s.title?.trim() || getCapability(s.action)?.title || s.action,
      reason: s.reason?.trim() || "",
      inputs: normaliseInputs(s.action, s.inputs ?? {}, snap),
    })),
    engine: "live",
    budget: RUN_BUDGET,
  };
}

/** The deterministic plan: a checklist, worked in order, skipping what's done. */
function rulesPlan(goal: Goal, snap: Snapshot): Plan {
  const doneText = snap.doneTasks.join(" ").toLowerCase();
  const has = (kind: string) => doneText.includes((getCapability(kind)?.title ?? kind).toLowerCase());

  const ladder = [
    "research.market",
    "plan.business",
    "doc.catalogue",
    "leads.find",
    "outreach.draft",
    "social.draft",
  ];

  // Walk the ladder, taking jobs until the cycle budget would be exceeded — so
  // the deterministic plan never proposes work it then has to skip.
  const chosen: string[] = [];
  let cost = 0;
  for (const kind of ladder) {
    if (has(kind)) continue;
    const c = getCapability(kind)?.credits ?? 2;
    if (cost + c > RUN_BUDGET) continue;
    chosen.push(kind);
    cost += c;
    if (chosen.length >= 2) break;
  }
  if (!chosen.length) {
    // Everything on the ladder is done: review instead, and say so.
    return {
      headline: `Reviewing where ${snap.businessName ?? "the business"} stands`,
      steps: [{
        action: "report.weekly",
        title: getCapability("report.weekly")?.title ?? "Weekly business review",
        reason: "The list is done; the useful next thing is a read on what moved.",
        inputs: normaliseInputs("report.weekly", {}, snap),
      }],
      engine: "rules",
      budget: RUN_BUDGET,
    };
  }

  return {
    headline: `Working down the list for: ${goal.goal}`,
    steps: chosen.map((kind) => ({
      action: kind,
      title: getCapability(kind)?.title ?? kind,
      reason: has(kind) ? "The last cycle finished the list, so this is a review." : "The next thing a new business needs.",
      inputs: normaliseInputs(kind, {}, snap),
    })),
    engine: "rules",
    budget: RUN_BUDGET,
  };
}

/** Fill the inputs a capability requires, from the goal and account, so a run never dead-ends. */
function normaliseInputs(kind: string, given: Record<string, string>, snap: Snapshot): Record<string, string> {
  const cap = getCapability(kind);
  const business = snap.businessName ?? "the business";
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(given ?? {})) {
    if (typeof v === "string" && v.trim()) out[k] = v.slice(0, 400);
  }
  for (const input of cap?.inputs ?? []) {
    if (out[input.key]?.trim()) continue;
    if (!input.required) continue;
    // One sensible default per known key rather than an empty string, which
    // would make the capability return a stub.
    const key = input.key.toLowerCase();
    if (key.includes("businessname") || key === "name") out[input.key] = business;
    else if (key.includes("idea")) out[input.key] = `${business} — growing it from where it is today`;
    else if (key.includes("audience")) out[input.key] = "people nearby who want this done properly";
    else if (key.includes("niche")) out[input.key] = business;
    else out[input.key] = input.label;
  }
  return out;
}

/**
 * Execute a plan. Costs credits, writes rows.
 *
 * Each step goes through `runCapability` + the same persistence the Run screen
 * uses, so an autonomous task is indistinguishable from a human-triggered one in
 * Documents. Steps stop when the budget would be exceeded.
 */
export async function act(
  goal: Goal,
  planResult: Plan,
  userId: string,
  emit: (s: RunStep) => void
): Promise<{ steps: RunStep[]; spent: number }> {
  const admin = adminClient();
  const steps: RunStep[] = [];
  let spent = 0;

  for (const step of planResult.steps) {
    const cap = getCapability(step.action);
    if (!cap) continue;
    const inputs = step.inputs ?? {};

    if (spent + cap.credits > planResult.budget) {
      const s: RunStep = { label: step.title, detail: "Skipped — this cycle's budget is spent", status: "failed" };
      steps.push(s); emit(s);
      continue;
    }

    const t0 = Date.now();
    const running: RunStep = { label: step.title, detail: step.reason || cap.blurb, status: "running" };
    steps.push(running); emit(running);

    // Charge through the same path a human run uses, so credit_events and the
    // balance stay consistent no matter who started the work.
    const { data: profile } = await admin.from("profiles").select("credits").eq("id", userId).single();
    const balance = (profile as any)?.credits ?? 0;
    if (balance < cap.credits) {
      const s: RunStep = { label: step.title, detail: "Not enough credits — stopped here", status: "failed", ms: Date.now() - t0 };
      steps[steps.length - 1] = s; emit(s);
      break;
    }

    const { data: task, error } = await admin.from("tasks").insert({
      user_id: userId,
      environment: cap.env,
      kind: cap.kind,
      title: step.title,
      detail: cap.blurb,
      status: "running",
      credit_cost: cap.credits,
      result: { inputs, autonomous: true, goal_id: goal.id },
    }).select().single();

    if (error || !task) {
      const s: RunStep = { label: step.title, detail: `Could not queue it: ${error?.message ?? "unknown"}`, status: "failed", ms: Date.now() - t0 };
      steps[steps.length - 1] = s; emit(s);
      continue;
    }

    await admin.from("profiles").update({ credits: balance - cap.credits }).eq("id", userId);
    await admin.from("credit_events").insert({
      user_id: userId, delta: -cap.credits, reason: `Milo worked on its own: ${step.title}`, task_id: task.id,
    });
    spent += cap.credits;

    try {
      const artifact = runCapability(cap.kind, inputs);
      const needsApproval = cap.approval ?? false;

      await admin.from("tasks").update({
        status: needsApproval ? "needs_approval" : "done",
        result: { ...artifact, inputs, needs_approval: needsApproval, autonomous: true },
        completed_at: needsApproval ? null : new Date().toISOString(),
      }).eq("id", task.id);

      // Same side effects as executeTask, so Documents and the queues fill up.
      if (["plan.business", "plan.pitch", "research.market", "research.competitors",
           "doc.catalogue", "support.faq"].includes(cap.kind)) {
        await admin.from("documents").insert({
          user_id: userId, kind: cap.kind, title: artifact.title, content: artifact.markdown, task_id: task.id,
        });
      }
      if (cap.kind === "outreach.draft") {
        await admin.from("outreach_campaigns").insert({
          user_id: userId, audience: inputs.audience || "prospects",
          draft: artifact.markdown, status: needsApproval ? "draft" : "approved",
        });
      }
      if (cap.kind === "social.draft") {
        await admin.from("social_posts").insert({
          user_id: userId, platform: (inputs.platform || "instagram").toLowerCase(),
          caption: artifact.markdown, status: needsApproval ? "draft" : "approved",
        });
      }

      const s: RunStep = {
        label: step.title,
        detail: needsApproval ? "Drafted — waiting for your OK before it leaves" : "Done",
        status: needsApproval ? "waiting" : "done",
        ms: Date.now() - t0,
      };
      steps[steps.length - 1] = s; emit(s);

      await admin.from("activity").insert({
        user_id: userId, task_id: task.id,
        message: needsApproval
          ? `Milo drafted ${step.title.toLowerCase()} on its own — waiting for your approval`
          : `Milo completed ${step.title.toLowerCase()} on its own`,
      });
    } catch (e: any) {
      // Refund exactly like a failed human run, so autonomy can never quietly
      // cost someone credits for work that did not happen.
      await admin.from("profiles").update({ credits: balance }).eq("id", userId);
      await admin.from("credit_events").insert({
        user_id: userId, delta: cap.credits, reason: `Refund: ${step.title} failed`, task_id: task.id,
      });
      await admin.from("tasks").update({ status: "failed", error: e?.message ?? "failed" }).eq("id", task.id);
      spent -= cap.credits;

      const s: RunStep = { label: step.title, detail: `Failed: ${e?.message ?? "unknown"}`, status: "failed", ms: Date.now() - t0 };
      steps[steps.length - 1] = s; emit(s);
    }
  }

  return { steps, spent };
}

/** The one-liner a person reads when they come back. */
export function summarise(planResult: Plan, steps: RunStep[]): string {
  const done = steps.filter((s) => s.status === "done").length;
  const waiting = steps.filter((s) => s.status === "waiting").length;
  const failed = steps.filter((s) => s.status === "failed").length;
  const bits: string[] = [];
  if (done) bits.push(`${done} finished`);
  if (waiting) bits.push(`${waiting} waiting on you`);
  if (failed) bits.push(`${failed} skipped`);
  return `${planResult.headline} — ${bits.join(", ") || "nothing to do"}.`;
}
