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
 *   meta/muse-glimmer-30b  reasoning model: ~0.7s to first reasoning token but
 *                        21-53s before it writes an answer. Too slow for chat.
 *
 *   MEASURED 2026-11-17 on the build prompt (structured JSON copy):
 *     nvidia/nemotron-3.5-bolt-e4b   4.4s total, 342ms to first byte
 *     z-ai/glm-5.3-flash            193s on a good run; aborted at 300s on the
 *                                   next two runs with reasoning_effort=low.
 *   A build that has to finish inside a 300s function wall cannot be a coin
 *   flip, so structured builds now default to the fast model. Reasoning models
 *   remain available by setting NVIDIA_MODEL.
 *
 *   Chat is deliberately NOT a reasoning model. Measured on this deployment:
 *     nvidia/nemotron-3.5-bolt-e4b         answer in ~0.25-0.35s
 *     meta/muse-glimmer-30b               answer in ~21-53s
 *     openai/gpt-oss-20b                  answer in ~24-67s
 *     nemotron-3.5-lightning / mistral     burn the whole budget on reasoning
 *                                         and return empty content
 *   Bolt writes a real answer in about a second, so the chat feels instant.
 *
 * NVIDIA_MODEL overrides the agent model, NVIDIA_CHAT_MODEL the chat model.
 */
// The reasoning model, kept for anyone who sets NVIDIA_MODEL explicitly.
export const REASONING_MODEL = "z-ai/glm-5.3-flash";
// Default for structured agent work (site builds): 4s instead of 200s.
export const DEFAULT_MODEL = "nvidia/nemotron-3.5-bolt-e4b";
export const CHAT_MODEL_DEFAULT = "nvidia/nemotron-3.5-bolt-e4b";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type LlmResult =
  | { ok: true; text: string; model: string; ms: number; reasoning?: string; toolCalls?: ToolCall[] }
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

export type ChatMessageWithTools =
  | ChatMessage
  | { role: "tool"; content: string; tool_call_id: string }
  | { role: "assistant"; content: string | null; tool_calls: ToolCall[] };

/** OpenAI-shaped function tool definition. */
export type ToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

/** A tool call the model asked for. `arguments` is raw JSON text — parse defensively. */
export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type CallOpts = {
  messages: (ChatMessage | ChatMessageWithTools)[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  model?: string;
  json?: boolean;
  /** "low" skips most of the model's thinking pass — measured 60s -> 15s */
  reasoningEffort?: "low" | "medium" | "high";
  tools?: ToolDef[];
  toolChoice?: "auto" | "none" | "required";
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
  if (opts.tools?.length) {
    body.tools = opts.tools;
    body.tool_choice = opts.toolChoice ?? "auto";
  }

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
    const calls: ToolCall[] | undefined = Array.isArray(msg.tool_calls) && msg.tool_calls.length
      ? msg.tool_calls
      : undefined;
    // A tool-calling turn legitimately has null content — that is not a failure.
    if (!text.trim() && !calls) {
      return {
        ok: false, model, ms, configured: true,
        error: `The model returned no content (finish_reason: ${json?.choices?.[0]?.finish_reason ?? "unknown"}).`,
      };
    }
    return { ok: true, text, model, ms, reasoning: msg.reasoning_content || undefined, toolCalls: calls };
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
  | { type: "done"; text: string; reasoning: string; model: string; ms: number; toolCalls?: ToolCall[] }
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
    ...(opts.tools?.length
      ? { tools: opts.tools, tool_choice: opts.toolChoice ?? "auto" }
      : {}),
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
  // Tool calls stream in fragments: the first chunk carries id/name, later
  // chunks append slices of the JSON arguments. They are keyed by `index`.
  const toolCalls: ToolCall[] = [];

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
      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const i = typeof tc.index === "number" ? tc.index : toolCalls.length;
          if (!toolCalls[i]) {
            toolCalls[i] = { id: tc.id ?? `call-${i}`, type: "function", function: { name: "", arguments: "" } };
          }
          if (tc.id) toolCalls[i].id = tc.id;
          if (tc.function?.name) toolCalls[i].function.name += tc.function.name;
          if (tc.function?.arguments) toolCalls[i].function.arguments += tc.function.arguments;
        }
      }
    }
  }

  const calls = toolCalls.filter(Boolean);

  // A turn that only asks for a tool has no prose. That is a complete turn, not
  // a failure — the caller runs the tool and asks the model again.
  if (!content.trim() && calls.length === 0) {
    yield {
      type: "error", model, ms: Date.now() - started,
      error: "The model finished without producing an answer. Try rephrasing, or run a built-in capability.",
    };
    return;
  }

  yield {
    type: "done", text: content, reasoning, model, ms: Date.now() - started,
    toolCalls: calls.length ? calls : undefined,
  };
}
