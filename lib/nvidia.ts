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

/**
 * Two models, measured on this endpoint (2026-11-13):
 *
 *   z-ai/glm-5.3-flash   reasoning ~55s before the first byte; best for long
 *                        structured work (builds, plans). Used by the agents.
 *   meta/muse-glimmer-30b  first token in ~0.7s, with reasoning_effort "low"
 *                        the answer starts ~15s. Used for chat.
 *
 * NVIDIA_MODEL overrides the agent model, NVIDIA_CHAT_MODEL the chat model.
 */
export const DEFAULT_MODEL = "z-ai/glm-5.3-flash";
export const CHAT_MODEL_DEFAULT = "meta/muse-glimmer-30b";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type LlmResult =
  | { ok: true; text: string; model: string; ms: number; reasoning?: string }
  | { ok: false; error: string; model: string; ms: number; configured: boolean };

export function modelId() {
  return process.env.NVIDIA_MODEL?.trim() || DEFAULT_MODEL;
}

export function chatModelId() {
  return process.env.NVIDIA_CHAT_MODEL?.trim() || CHAT_MODEL_DEFAULT;
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
  /** "low" skips most of the model's thinking pass — measured 60s -> 15s */
  reasoningEffort?: "low" | "medium" | "high";
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

// ---------------------------------------------------------------------------
// Streaming. glm-5.3-flash is a reasoning model: on this endpoint the first
// byte arrives around 55–60s and it emits reasoning_content before content.
// We surface both as SSE so the UI can show real progress instead of a spinner.
// ---------------------------------------------------------------------------

export type StreamEvent =
  | { type: "thinking"; text: string }
  | { type: "delta"; text: string }
  | { type: "done"; text: string; reasoning: string; model: string; ms: number }
  | { type: "error"; error: string; model: string; ms: number };

export async function* nvidiaStream(opts: CallOpts): AsyncGenerator<StreamEvent> {
  const model = opts.model || chatModelId();
  const started = Date.now();
  const key = process.env.NVIDIA_API_KEY?.trim();

  if (!key) {
    yield { type: "error", model, ms: 0, error: "NVIDIA_API_KEY is not set on this deployment." };
    return;
  }

  // glm-5.3-flash spends ~4.4k tokens reasoning before it writes a word, and
  // those tokens count against max_tokens. Measured: 1100 -> finish_reason
  // "length" with a truncated answer; 3000 -> clean "stop". So we always give
  // the answer its own headroom on top of the reasoning it needs.
  const body = JSON.stringify({
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 1200,
    stream: true,
    ...(opts.reasoningEffort ? { reasoning_effort: opts.reasoningEffort } : {}),
  });

  let res: Response;
  try {
    res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, Accept: "text/event-stream" },
      body,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 280_000),
    });
  } catch (e: any) {
    const timedOut = e?.name === "TimeoutError" || e?.name === "AbortError";
    yield {
      type: "error", model, ms: Date.now() - started,
      error: timedOut
        ? "The model did not respond in time. Try again, or run a built-in capability instead."
        : `Could not reach NVIDIA: ${e?.message ?? "unknown error"}`,
    };
    return;
  }

  if (!res.ok || !res.body) {
    const raw = await res.text().catch(() => "");
    let detail = raw.slice(0, 300);
    try { const j = JSON.parse(raw); detail = j.detail || j.message || detail; } catch {}
    yield { type: "error", model, ms: Date.now() - started, error: `NVIDIA API ${res.status}: ${detail}` };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let reasoning = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      let parsed: any;
      try { parsed = JSON.parse(payload); } catch { continue; }

      const delta = parsed?.choices?.[0]?.delta ?? {};
      if (delta.reasoning_content) {
        reasoning += delta.reasoning_content;
        yield { type: "thinking", text: delta.reasoning_content };
      }
      if (delta.content) {
        content += delta.content;
        yield { type: "delta", text: delta.content };
      }
    }
  }

  if (!content.trim()) {
    yield {
      type: "error", model, ms: Date.now() - started,
      error: "The model finished without producing an answer. Try rephrasing, or run a built-in capability.",
    };
    return;
  }

  yield { type: "done", text: content, reasoning, model, ms: Date.now() - started };
}
