import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nvidiaStream, isConfigured, chatModelId } from "@/lib/nvidia";
import { HARNESS_PREAMBLE } from "@/lib/harness";
import { rateLimit } from "@/lib/ratelimit";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const SYSTEM = `${HARNESS_PREAMBLE}

You are Milo, the AI employee inside Foundly. You build websites, brand copy, outreach and plans for small businesses.
Voice: direct, warm, concrete. You are a capable operator, not a search engine.

Rules of the voice:
- Never say you lack real-time data, and never tell the user to go search Google or Instagram. You are the one who does the work.
- Reply in 2-4 short sentences, then up to 4 one-line bullets of concrete next steps.
- Never invent prices, statistics, customer counts or guarantees.
- If you genuinely need a fact, ask for it in one short question at the end.
- NEVER output HTML, CSS, JavaScript, JSON or code blocks in chat. If someone asks
  you to build a page, say you will build it and point them at Build — do not write the page here.
- You can only act through Foundly: building the site, drafting outreach and posts, planning.`;


/**
 * Server-sent events. Chat runs on a non-reasoning model (bolt) so the answer
 * starts in well under a second; any reasoning tokens an override model emits
 * are still forwarded as `thinking` events, so the UI shows live work either way.
 */
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

  const stream = new ReadableStream({
    async start(controller) {
      // The response can be closed underneath us (proxy restart, client tab
      // closed, platform recycle). Writing to a closed controller throws
      // "Invalid state: Controller is already closed", which used to abort the
      // whole start() block mid-generation — so the reply was rendered from
      // deltas but never saved. A dead socket must never stop the work or the
      // persistence; it should only stop the delivery.
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

      // Save the user's turn immediately. Waiting until the model finishes meant
      // that closing the tab mid-reply lost BOTH turns, so a reload looked like
      // the conversation had been wiped. The reply is appended when it lands.
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

      // Heartbeat: keeps proxies from closing the connection during the
      // ~60s reasoning window and lets the client measure elapsed time.
      const beat = setInterval(() => {
        try { send({ type: "tick", ms: Date.now() - started }); } catch {}
      }, 1000);

      const prior = Array.isArray(history)
        ? history
            .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
            .slice(-8)
            .map((m: any) => ({ role: m.role, content: m.content.slice(0, 2000) }))
        : [];

      let finalText = "";
      let partial = "";


      try {
        for await (const ev of nvidiaStream({
          messages: [
            { role: "system", content: SYSTEM },
            ...prior,
            {
              role: "user",
              content: `${business ? `Business context: ${business}\n\n` : ""}${message}`,
            },
          ],
          maxTokens: 1200,
          temperature: 0.5,
          reasoningEffort: "low",
          timeoutMs: 285_000,
        })) {
          // Remember the final text but DON'T emit "done" yet: the client uses it
          // as the signal that the turn is complete, so the row has to be in the
          // database first or an immediate reload races the insert and the reply
          // appears to vanish.
          if (ev.type === "done") { finalText = ev.text; continue; }
          if (ev.type === "delta") partial += ev.text;
          send(ev);
        }
      } catch (e: any) {
        // Keep whatever was generated: a partial answer that is saved is far
        // better than a good answer that vanishes on reload.
        if (partial) finalText = partial;
        console.error("[milo/stream] generation failed:", e?.message ?? e);
        send({ type: "error", error: e?.message || "The stream ended unexpectedly." });
      } finally {
        clearInterval(beat);
      }

      // Persist the reply before telling the client it is done.
      //
      // The previous `try { await ... } catch {}` was useless: supabase-js
      // returns a { error } object rather than throwing, so a failed insert
      // looked like success and the reply vanished on the next load. Check the
      // error explicitly and, if the write fails, still deliver the text — but
      // log it so a silent data loss can never hide again.
      if (user) {
        try {
          if (finalText) {
            const { error: writeError } = await supabase.from("milo_messages").insert({
              user_id: user.id, role: "assistant", content: finalText.slice(0, 8000),
            });
            if (writeError) {
              console.error("[milo/stream] assistant turn not saved:", writeError.message);
            }
          }
          const { error: actError } = await supabase.from("activity").insert({
            user_id: user.id,
            message: `Milo replied (${chatModelId()})`,
          });
          if (actError) console.error("[milo/stream] activity not saved:", actError.message);
        } catch (e: any) {
          console.error("[milo/stream] persistence threw:", e?.message ?? e);
        }
      }

      if (finalText) send({ type: "done", text: finalText });

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
