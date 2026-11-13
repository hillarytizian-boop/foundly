import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { task_id, decision } = await req.json();
  if (!task_id || !["approve", "reject"].includes(decision)) {
    return NextResponse.json({ error: "task_id and decision (approve|reject) required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const { data: task } = await supabase.from("tasks").select("*").eq("id", task_id).single();
  if (!task || task.user_id !== user.id) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (task.status !== "needs_approval") {
    return NextResponse.json({ error: `Task is ${task.status}, not awaiting approval` }, { status: 409 });
  }

  const approved = decision === "approve";
  await supabase.from("tasks").update({
    status: approved ? "done" : "rejected",
    approved_at: new Date().toISOString(),
    completed_at: approved ? new Date().toISOString() : null,
  }).eq("id", task_id);

  await supabase.from("activity").insert({
    user_id: user.id,
    task_id,
    message: approved ? `You approved: ${task.title}` : `You rejected: ${task.title}`,
  });

  return NextResponse.json({ ok: true, status: approved ? "done" : "rejected" });
}
