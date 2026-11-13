import { NextResponse } from "next/server";
import { isConfigured, modelId, nvidiaChat, NVIDIA_BASE } from "@/lib/nvidia";

// Reports whether the live model is wired, without ever exposing the key.
export async function GET() {
  const configured = isConfigured();
  return NextResponse.json({
    configured,
    model: modelId(),
    endpoint: NVIDIA_BASE,
    key_present: configured,
    note: configured
      ? "NVIDIA model is configured server-side. The key is never sent to the browser."
      : "Add NVIDIA_API_KEY to the deployment environment to turn on live agent runs. The built-in team works without it.",
  });
}

// A tiny probe so the UI can prove the model really answers.
export async function POST(req: Request) {
  const { prompt } = await req.json().catch(() => ({ prompt: "" }));
  if (!prompt?.trim()) return NextResponse.json({ error: "prompt required" }, { status: 400 });

  const r = await nvidiaChat({
    messages: [
      { role: "system", content: "You are Milo, the AI employee inside Foundly. Be specific, compact and practical. No markdown headings." },
      { role: "user", content: prompt },
    ],
    maxTokens: 700,
    timeoutMs: 285_000,
    temperature: 0.5,
  });

  if (!r.ok) {
    return NextResponse.json({
      ok: false, error: r.error, configured: r.configured, model: r.model, ms: r.ms,
    }, { status: r.configured ? 502 : 503 });
  }
  return NextResponse.json({ ok: true, text: r.text, model: r.model, ms: r.ms });
}
