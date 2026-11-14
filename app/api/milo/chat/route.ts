import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nvidiaChat, isConfigured, modelId } from "@/lib/nvidia";
import { HARNESS_PREAMBLE } from "@/lib/harness";
import { rateLimit } from "@/lib/ratelimit";

export const maxDuration = 300;

export async function POST(req: Request) {
  const { message, business } = await req.json().catch(() => ({ message: "" }));
  if (!message?.trim()) return NextResponse.json({ error: "Say something first." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const limit = rateLimit(`chat:${user.id}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Slow down — try again in ${limit.retryAfter}s.` },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }

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
