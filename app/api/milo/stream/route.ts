import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nvidiaStream, isConfigured, chatModelId, type ToolCall } from "@/lib/nvidia";
import { HARNESS_PREAMBLE } from "@/lib/harness";
import { rateLimit } from "@/lib/ratelimit";
import { TOOL_DEFS, getTool, parseArgs, type ToolCtx } from "@/lib/milo/tools";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const SYSTEM = `${HARNESS_PREAMBLE}

You are Milo, the AI employee inside Foundly. You do not describe work — you do it.

HOW YOU WORK
- You have tools. When the user asks for something that a tool covers, CALL THE TOOL
  immediately. Do not explain what they should do instead, and never tell them to go
  somewhere else to do it themselves.
- "Connect my Gmail" → connect_tool. "Build me a landing page" → build_site.
  "Publish it" → publish_site. "Post this to X" → post_to_social.
  "What's my balance?" → get_status. "Draft a reply to this customer" → run_capability.
- If a tool returns needs_connect, call connect_tool for that channel, then tell the
  user you've made the link for them.
- ACCURACY: a tool that returns awaiting_user has NOT connected anything. Say "I made
  you the link — it finishes when you open it." Never say an account is connected,
  linked or ready unless a tool result says connected: true. Never claim you sent an
  email, posted, or published unless a tool returned ok with a real result.
- Chain tools when the user's intent needs it (build then publish), but never publish,
  post, or disconnect unless they asked for it.
- After the tools finish, report what you did in 1-3 short sentences, then at most 3
  one-line next steps. Past tense, concrete: "Built Ember Lane — 100/100 and unpublished."

AUTONOMY
- You can work without being asked. When the user wants something kept going ("keep
  growing this", "every day", "work on this while I sleep"), call add_goal — do not
  agree to do it and then wait. A goal makes you genuinely operate on a schedule.
- "Stop doing things on your own" / "pause" → set_autopilot with enabled: false.
- Never say you will "remember to do it later" in this conversation. A conversation
  does not persist; a goal does. That is what add_goal is for.

VOICE
- Direct, warm, concrete. A capable operator, not a search engine.
- Never say you lack real-time data. Never invent prices, statistics, customer counts
  or guarantees.
- If you genuinely need a fact, ask one short question instead of guessing.
- NEVER output HTML, CSS, JavaScript, JSON or code blocks in chat.`;

/** Where the loop gives up. A tool loop that cannot end is worse than a plain answer. */
const MAX_STEPS = 5;

type StepRecord = {
  label: string;
  detail?: string;
  status: "running" | "done" | "failed";
  ms?: number;
};

type AnyMsg = Record<string, unknown>;

/**
 * The model sometimes ignores the "never output HTML" rule and answers with a
 * whole page after a build. That is not a chat reply — showing it produces the
 * "that came back as a full page" dead end. Detect it so we can re-ask.
 */
function looksLikePage(t: string) {
  const head = t.trim().slice(0, 200);
  return /^\s*<!DOCTYPE html|<html[\s>]|^\s*```html|^\s*<body[\s>]/i.test(head);
}

/** Last-resort reply built from what actually happened, if the model misbehaves. */
function describeSteps(steps: StepRecord[]) {
  const done = steps.filter((s) => s.status === "done" && s.detail);
  if (!done.length) return "I couldn't complete that. Nothing was changed.";
  return done.map((s) => s.detail).join(" ");
}

export async function POST(req: Request) {
  const { message, history, business } = await req
    .json()
    .catch(() => ({ message: "", history: [], business: undefined }));

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "Say something first." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const limit = await rateLimit(`chat:${user.id}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Slow down — try again in ${limit.retryAfter}s.` },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }

  // Links Milo hands out must be same-origin as the page the user is on, or the
  // session cookie does not travel with them. `req.url` resolves to whatever
  // host the server thinks it is bound to (localhost, behind a proxy, an
  // internal name), so prefer the forwarded headers the browser actually used.
  const origin = (() => {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    if (!host) return new URL(req.url).origin;
    return `${proto}://${host}`;
  })();
  const ctx: ToolCtx = { userId: user.id, origin, supabase };

  const stream = new ReadableStream({
    async start(controller) {
      // A dead socket must never stop the work or the persistence: it should
      // only stop the delivery. See the closed-stream fix in c4d9241.
      let closed = false;
      const send = (obj: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const started = Date.now();

      // Save the user's turn immediately so closing the tab never loses both turns.
      try {
        await supabase.from("milo_messages").insert({
          user_id: user.id, role: "user", content: message.slice(0, 4000),
        });
      } catch {
        /* persistence must never break the reply */
      }

      if (!isConfigured()) {
        send({
          type: "error",
          error: "Live reasoning is off on this deployment, so I can only run the built-in tasks. Try any capability on Home or Build and I'll do that deterministically.",
        });
        controller.close();
        return;
      }

      const beat = setInterval(() => {
        try { send({ type: "tick", ms: Date.now() - started }); } catch {}
      }, 1000);

      const prior: AnyMsg[] = Array.isArray(history)
        ? history
            .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
            .slice(-8)
            .map((m: any) => ({ role: m.role, content: m.content.slice(0, 2000) }))
        : [];

      const messages: AnyMsg[] = [
        { role: "system", content: SYSTEM },
        ...prior,
        { role: "user", content: `${business ? `Business context: ${business}\n\n` : ""}${message}` },
      ];

      const steps: StepRecord[] = [];
      let finalText = "";
      let partial = "";
      let artifact: { kind: "site"; html: string; title: string } | undefined;
      const links: { label: string; href: string }[] = [];

      try {
        for (let step = 0; step < MAX_STEPS; step++) {
          let calls: ToolCall[] = [];
          let turnText = "";
          partial = "";

          for await (const ev of nvidiaStream({
            messages: messages as any,
            maxTokens: 1200,
            temperature: 0.4,
            reasoningEffort: "low",
            timeoutMs: 120_000,
            tools: TOOL_DEFS,
            toolChoice: "auto",
          })) {
            if (ev.type === "done") {
              turnText = ev.text;
              calls = ev.toolCalls ?? [];
              continue;
            }
            if (ev.type === "delta") {
              partial += ev.text;
              // Only prose the user will actually keep is streamed live. Prose
              // emitted alongside a tool call is preamble ("Let me connect
              // that…") and is superseded by the final answer.
              if (!calls.length) send(ev);
            }
            if (ev.type === "thinking") send(ev);
            if (ev.type === "error") {
              send(ev);
              if (!finalText) finalText = partial;
            }
          }

          if (!calls.length) {
            finalText = turnText || partial;
            break;
          }

          // The model asked for tools. Record the call verbatim so the next
          // request replays the conversation exactly as the API expects.
          messages.push({
            role: "assistant",
            content: turnText || null,
            tool_calls: calls,
          });

          let anyFailed = false;

          for (const call of calls) {
            const tool = getTool(call.function.name);
            const args = parseArgs(call.function.arguments);

            if (!tool) {
              const msg = `Unknown tool: ${call.function.name}`;
              steps.push({ label: msg, status: "failed" });
              send({ type: "step", label: msg, status: "failed" });
              messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ ok: false, error: msg }) });
              anyFailed = true;
              continue;
            }

            const label = tool.def.function.name.replace(/_/g, " ");
            const stepIndex = steps.length;
            steps.push({ label, status: "running" });
            const t0 = Date.now();
            send({ type: "step", label, status: "running", index: stepIndex });

            // Tool-level work events stream straight through, so a multi-second
            // build shows its agents instead of one frozen spinner.
            const emit = (e: { label: string; detail?: string }) => {
              steps.push({ label: e.label, detail: e.detail, status: "running" });
              send({ type: "step", label: e.label, detail: e.detail, status: "running", index: steps.length - 1 });
            };

            let result;
            try {
              result = await tool.run(args, ctx, emit);
            } catch (e: any) {
              result = { ok: false, summary: `${label} failed: ${e?.message ?? "unknown error"}` };
            }

            const ms = Date.now() - t0;

            // Sub-steps emitted while the tool ran ("Strategist", "Preparing the
            // link") are only ever sent as *running* — they have no result of
            // their own. Close them here, or the saved work log keeps blinking
            // "Working" on a turn that finished minutes ago.
            const closed: number[] = [];
            for (let i = stepIndex + 1; i < steps.length; i++) {
              if (steps[i].status === "running") {
                steps[i] = { ...steps[i], status: result.ok ? "done" : "failed" };
                closed.push(i);
              }
            }
            if (closed.length) send({ type: "steps-done", indices: closed, status: result.ok ? "done" : "failed" });

            steps[stepIndex] = { ...steps[stepIndex], status: result.ok ? "done" : "failed", detail: result.summary, ms };
            send({
              type: "step",
              label,
              status: result.ok ? "done" : "failed",
              detail: result.summary,
              index: stepIndex,
              ms,
            });

            if (result.link) {
              links.push(result.link);
              send({ type: "link", label: result.link.label, href: result.link.href });
            }
            if (result.artifact) {
              artifact = result.artifact;
              send({ type: "artifact", html: result.artifact.html, title: result.artifact.title });
            }
            if (!result.ok) anyFailed = true;

            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify({
                ok: result.ok,
                summary: result.summary,
                data: result.data ?? null,
              }).slice(0, 6000),
            });
          }

          // A failed tool ends the loop: the model gets one chance to explain it,
          // but we do not let it retry forever against a broken connection.
          if (anyFailed && step >= 1) break;
        }

        // If the turn produced a page instead of prose, or no prose at all, ask
        // once more with tools off and the results in front of it. This is the
        // difference between "that came back as a full page" and a real answer.
        if (steps.length && (!finalText.trim() || looksLikePage(finalText))) {
          const summary = describeSteps(steps);
          try {
            let repaired = "";
            for await (const ev of nvidiaStream({
              messages: [
                ...(messages as any),
                {
                  role: "user",
                  content:
                    "Now reply to the person in the conversation. 1-3 short sentences, plain prose, no HTML, " +
                    "no code, no markdown headers. Say what you actually did.\n\n" +
                    `What the tools returned: ${summary}\n\n` +
                    "Be strictly accurate: only say something is connected if a tool said it is connected. " +
                    "If you only produced a link, say you made them a link to finish it themselves.",
                },
              ],
              maxTokens: 400,
              temperature: 0.4,
              reasoningEffort: "low",
              timeoutMs: 60_000,
              toolChoice: "none",
            })) {
              if (ev.type === "delta") repaired += ev.text;
              if (ev.type === "done") repaired = ev.text || repaired;
            }
            if (repaired.trim() && !looksLikePage(repaired)) finalText = repaired.trim();
          } catch {
            /* fall through to the deterministic summary */
          }
          if (!finalText.trim() || looksLikePage(finalText)) finalText = summary;
        }

        if (!finalText && !partial && !steps.length) {
          finalText = "";
        }
      } catch (e: any) {
        if (partial) finalText = partial;
        console.error("[milo/stream] generation failed:", e?.message ?? e);
        send({ type: "error", error: e?.message || "The stream ended unexpectedly." });
      } finally {
        clearInterval(beat);
      }

      // Persist the reply before telling the client it is done, and keep the
      // work log with it so a reload still shows what Milo did.
      if (user) {
        try {
          if (finalText) {
            const { error: writeError } = await supabase.from("milo_messages").insert({
              user_id: user.id,
              role: "assistant",
              content: finalText.slice(0, 8000),
              steps: steps.length ? (steps as any) : null,
            });
            if (writeError) console.error("[milo/stream] assistant turn not saved:", writeError.message);
          }
          const { error: actError } = await supabase.from("activity").insert({
            user_id: user.id,
            message: `Milo replied (${chatModelId()})${steps.length ? ` · ${steps.length} steps` : ""}`,
          });
          if (actError) console.error("[milo/stream] activity not saved:", actError.message);
        } catch (e: any) {
          console.error("[milo/stream] persistence threw:", e?.message ?? e);
        }
      }

      if (finalText) send({ type: "done", text: finalText, steps, links });

      try { controller.close(); } catch { /* already gone */ }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
