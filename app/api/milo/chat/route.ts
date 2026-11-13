import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nvidiaChat, isConfigured, modelId } from "@/lib/nvidia";
import { HARNESS_PREAMBLE } from "@/lib/harness";

export const maxDuration = 300;

export async function POST(req: Request) {
  const { message, business } = await req.json().catch(() => ({ message: "" }));
  if (!message?.trim()) return NextResponse.json({ error: "Say something first." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!isConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      reply: "Live reasoning is off on this deployment (no model key), so I can only run the built-in tasks — try any capability on Home or Build and I'll do that deterministically.",
    }, { status: 503 });
  }

  const r = await nvidiaChat({
    messages: [
      { role: "system", content: `${HARNESS_PREAMBLE}\n\nYou are Milo, Foundly's AI employee. Answer in at most 5 short sentences or a 4-item list. Never invent prices or guarantees.` },
      { role: "user", content: `${business ? `Business context: ${business}\n\n` : ""}${message}` },
    ],
    maxTokens: 900,
    timeoutMs: 285_000,
  });

  if (!r.ok) {
    return NextResponse.json({ ok: false, configured: r.configured, error: r.error, model: r.model }, { status: 502 });
  }

  if (user) {
    await supabase.from("activity").insert({ user_id: user.id, message: `Milo answered a question (${r.model})` });
  }

  return NextResponse.json({ ok: true, reply: r.text, model: modelId(), ms: r.ms });
}
