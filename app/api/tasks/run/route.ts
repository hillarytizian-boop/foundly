import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCapability } from "@/lib/capabilities";
import { executeTask } from "@/lib/tasks";

export async function POST(req: Request) {
  try {
    const { kind, inputs } = await req.json();
    const cap = getCapability(kind);
    if (!cap) return NextResponse.json({ error: `Unknown capability: ${kind}` }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to run tasks" }, { status: 401 });

    const missing = cap.inputs.filter((i) => i.required && !String(inputs?.[i.key] ?? "").trim());
    if (missing.length) {
      return NextResponse.json({ error: `Missing: ${missing.map((m) => m.label).join(", ")}` }, { status: 400 });
    }

    const { data: task, error } = await supabase.from("tasks").insert({
      user_id: user.id,
      environment: cap.env,
      kind: cap.kind,
      title: cap.title,
      detail: cap.blurb,
      status: "queued",
      credit_cost: cap.credits,
      result: { inputs },
    }).select().single();

    if (error || !task) return NextResponse.json({ error: error?.message || "Could not create task" }, { status: 500 });

    const out = await executeTask(task.id);
    if ("error" in out) {
      return NextResponse.json({ error: out.error, balance: (out as any).balance }, { status: out.status });
    }
    return NextResponse.json({ task_id: task.id, ...out });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Run failed" }, { status: 500 });
  }
}
