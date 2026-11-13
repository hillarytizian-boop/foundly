import { createClient } from "@/lib/supabase/server";
import { getCapability } from "@/lib/capabilities";
import { runCapability } from "@/lib/engine";

/** Server-only helper: run a task end-to-end with credit accounting. */
export async function executeTask(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not signed in", status: 401 as const };

  const { data: task } = await supabase.from("tasks").select("*").eq("id", taskId).single();
  if (!task) return { error: "task not found", status: 404 as const };
  if (task.user_id !== user.id) return { error: "forbidden", status: 403 as const };

  const cap = getCapability(task.kind);
  const cost = cap?.credits ?? task.credit_cost ?? 1;

  // charge credits
  const { data: profile } = await supabase.from("profiles").select("credits").eq("id", user.id).single();
  const balance = profile?.credits ?? 0;
  if (balance < cost) {
    await supabase.from("tasks").update({ status: "failed", error: "Not enough credits" }).eq("id", taskId);
    return { error: "Not enough credits", status: 402 as const, balance, cost };
  }

  await supabase.from("tasks").update({ status: "running", credit_cost: cost }).eq("id", taskId);
  await supabase.from("profiles").update({ credits: balance - cost }).eq("id", user.id);
  await supabase.from("credit_events").insert({ user_id: user.id, delta: -cost, reason: `Ran: ${task.title}`, task_id: taskId });

  try {
    const artifact = runCapability(task.kind, (task.result?.inputs as Record<string, string>) || {});
    const needsApproval = cap?.approval ?? false;

    await supabase.from("tasks").update({
      status: needsApproval ? "needs_approval" : "done",
      result: { ...artifact, inputs: task.result?.inputs ?? {}, needs_approval: needsApproval },
      completed_at: needsApproval ? null : new Date().toISOString(),
    }).eq("id", taskId);

    // Side effects: persist the artefacts the rest of the app reads from
    const inputs = (task.result?.inputs as Record<string, string>) || {};
    if (task.kind === "site.generate") {
      await supabase.from("sites").insert({
        user_id: user.id,
        business_name: inputs.businessName || "Untitled",
        idea: inputs.idea || "your business",
        content: artifact as any,
      });
    }
    if (["plan.business", "plan.pitch", "research.market", "research.competitors", "doc.catalogue", "support.faq"].includes(task.kind)) {
      await supabase.from("documents").insert({
        user_id: user.id, kind: task.kind, title: artifact.title, content: artifact.markdown, task_id: taskId,
      });
    }
    if (task.kind === "outreach.draft") {
      await supabase.from("outreach_campaigns").insert({
        user_id: user.id, audience: inputs.audience || "prospects", draft: artifact.markdown, status: needsApproval ? "draft" : "approved",
      });
    }
    if (task.kind === "social.draft") {
      await supabase.from("social_posts").insert({
        user_id: user.id, platform: (inputs.platform || "instagram").toLowerCase(), caption: artifact.markdown, status: needsApproval ? "draft" : "approved",
      });
    }

    await supabase.from("activity").insert({
      user_id: user.id,
      task_id: taskId,
      message: needsApproval ? `${task.title} drafted — waiting for your approval` : `${task.title} completed`,
    });

    return { ok: true, status: 200 as const, artifact, needsApproval, balance: balance - cost };
  } catch (e: any) {
    await supabase.from("tasks").update({ status: "failed", error: e.message }).eq("id", taskId);
    await supabase.from("profiles").update({ credits: balance }).eq("id", user.id); // refund
    await supabase.from("credit_events").insert({ user_id: user.id, delta: cost, reason: "Refund: task failed", task_id: taskId });
    return { error: e.message || "Task failed", status: 500 as const };
  }
}
