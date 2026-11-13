// NVIDIA NIM client (OpenAI-compatible endpoint).
//
// The API key is NEVER committed and NEVER sent to the browser: it is read from
// the server-side environment and only used inside route handlers.
//
//   NVIDIA_API_KEY   set in Vercel project settings (sensitive)
//   NVIDIA_MODEL     optional, defaults to z-ai/glm-5.3-flash
//
// Reality check baked into this module: glm-5.3-flash is a reasoning model and
// answers in ~60–180s. Every call therefore has an explicit timeout and the
// callers must always have a deterministic fallback. We never invent output
// when the model fails — the failure is reported to the caller verbatim.

export const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";
export const DEFAULT_MODEL = "z-ai/glm-5.3-flash";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type LlmResult =
  | { ok: true; text: string; model: string; ms: number; reasoning?: string }
  | { ok: false; error: string; model: string; ms: number; configured: boolean };

export function modelId() {
  return process.env.NVIDIA_MODEL?.trim() || DEFAULT_MODEL;
}

export function isConfigured() {
  return Boolean(process.env.NVIDIA_API_KEY?.trim());
}

type CallOpts = {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  model?: string;
  json?: boolean;
};

export async function nvidiaChat(opts: CallOpts): Promise<LlmResult> {
  const model = opts.model || modelId();
  const started = Date.now();
  const key = process.env.NVIDIA_API_KEY?.trim();

  if (!key) {
    return {
      ok: false, model, ms: 0, configured: false,
      error: "NVIDIA_API_KEY is not set on this deployment, so the live model is off. The built-in agent team still works.",
    };
  }

  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 4096,
    stream: false,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  try {
    const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 240_000),
    });

    const ms = Date.now() - started;
    const raw = await res.text();

    if (!res.ok) {
      let detail = raw.slice(0, 300);
      try {
        const j = JSON.parse(raw);
        detail = j.detail || j.message || detail;
      } catch {}
      return { ok: false, model, ms, configured: true, error: `NVIDIA API ${res.status}: ${detail}` };
    }

    const json = JSON.parse(raw);
    const msg = json?.choices?.[0]?.message ?? {};
    const text: string = msg.content ?? "";
    if (!text.trim()) {
      return {
        ok: false, model, ms, configured: true,
        error: `The model returned no content (finish_reason: ${json?.choices?.[0]?.finish_reason ?? "unknown"}).`,
      };
    }
    return { ok: true, text, model, ms, reasoning: msg.reasoning_content || undefined };
  } catch (e: any) {
    const ms = Date.now() - started;
    const timedOut = e?.name === "TimeoutError" || e?.name === "AbortError";
    return {
      ok: false, model, ms, configured: true,
      error: timedOut
        ? `The model did not answer within ${Math.round((opts.timeoutMs ?? 240_000) / 1000)}s. Reasoning models on this endpoint are slow — try again or use the fast team.`
        : `Could not reach NVIDIA: ${e?.message ?? "unknown error"}`,
    };
  }
}

/** Best-effort JSON extraction: models sometimes wrap JSON in prose or fences. */
export function extractJson<T = any>(text: string): T | null {
  const cleaned = text.replace(/^```(?:json)?/gm, "").replace(/```$/gm, "").trim();
  const attempts = [cleaned];

  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) attempts.push(cleaned.slice(first, last + 1));

  for (const a of attempts) {
    try {
      return JSON.parse(a) as T;
    } catch {}
  }
  return null;
}

/** Pull a complete HTML document out of a model reply. */
export function extractHtml(text: string): string | null {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/<!DOCTYPE html|<html[\s>]/i);
  if (start < 0) return null;
  const tail = candidate.slice(start);
  const endIdx = tail.toLowerCase().lastIndexOf("</html>");
  const html = endIdx > 0 ? tail.slice(0, endIdx + 7) : tail;
  return html.length > 400 ? html : null;
}
