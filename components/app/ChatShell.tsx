"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlowCloud } from "@/components/marketing/Mascot";

export type WorkStep = { label: string; detail?: string; status: "running" | "done" | "failed"; ms?: number };

export type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  id?: string;
  /** the work Milo did for this turn, replayed from the database on reload */
  steps?: WorkStep[];
  links?: { label: string; href: string }[];
  /** a page Milo built this turn — kept so the preview does not vanish on completion */
  artifact?: { html: string; title: string };
};

type Props = {
  business?: string | null;
  initial?: ChatMsg[];
  compact?: boolean;
  /** a first idea handed over from onboarding — sent as soon as the thread mounts */
  autoSend?: string;
  onComplete?: () => void;
};

type Status = "idle" | "connecting" | "thinking" | "writing" | "done" | "error";

const GREETING: ChatMsg = {
  role: "assistant",
  content: "Hi, I'm Milo. What are we building?",
};

/**
 * The chat surface. Two things make it feel fast even though the model is slow:
 * the message appears the instant you press send, and the reasoning stream is
 * shown as live work with a running clock — so the wait is visible progress,
 * never a blank box.
 */
export default function ChatShell({ business, initial, compact = false, autoSend, onComplete }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMsg[]>(
    initial && initial.length ? initial : [GREETING]
  );
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [trace, setTrace] = useState("");
  const [steps, setSteps] = useState<WorkStep[]>([]);
  const [links, setLinks] = useState<{ label: string; href: string }[]>([]);
  const [artifact, setArtifact] = useState<{ html: string; title: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const busy = status === "connecting" || status === "thinking" || status === "writing";

  const autoFired = useRef(false);
  useEffect(() => {
    if (!autoSend || autoFired.current) return;
    autoFired.current = true;
    const t = setTimeout(() => send(autoSend), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend]);

  /**
   * Adopt history that arrives after mount.
   *
   * `initial` is empty on the first render (the page is still fetching) and the
   * real thread lands a moment later. useState only reads its seed once, so
   * without this the conversation was silently dropped on every reload — the
   * DB had the messages, the UI just never showed them. Guarded on "no local
   * messages yet" so it can never clobber a reply that is already on screen.
   */
  useEffect(() => {
    if (!initial || initial.length === 0) return;
    setMessages((current) =>
      current.length <= 1 && current[0]?.content === GREETING.content ? initial : current
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, answer, trace, status]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  // keep the textarea sized to its content
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 190) + "px";
  }, [input]);

  function stop() {
    abortRef.current?.abort();
    setStatus("idle");
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;

    const history = messages.filter((m) => m.content !== GREETING.content);
    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    setStatus("connecting");
    setElapsed(0);
    setTrace("");
    setAnswer("");
    setError(null);
    setShowTrace(true);
    setSteps([]);
    setLinks([]);
    setArtifact(null);

    const ac = new AbortController();
    abortRef.current = ac;

    let acc = "";
    let think = "";
    // The finished message must be built from local accumulators, not from the
    // `steps`/`links`/`artifact` state: a closure created before those renders
    // keeps the values it captured at call time, so reading the state here
    // silently attached an empty work log to every reply. (The database had the
    // steps, so a reload showed them and hid the bug.)
    let stepsAcc: WorkStep[] = [];
    let linksAcc: { label: string; href: string }[] = [];
    let artifactAcc: { html: string; title: string } | null = null;

    try {
      const res = await fetch("/api/milo/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history, business: business ?? undefined }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          let ev: any;
          try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }

          if (ev.type === "tick") {
            setStatus((s) => (s === "connecting" ? "thinking" : s));
            continue;
          }
          if (ev.type === "thinking") {
            think += ev.text;
            setTrace(think);
            setStatus("thinking");
          }
          if (ev.type === "delta") {
            acc += ev.text;
            setAnswer(acc);
            setStatus("writing");
          }
          if (ev.type === "step") {
            // Work is visible as it happens: one row per tool, replaced in place
            // as it moves running -> done. `index` is stable across updates.
            {
              const i = typeof ev.index === "number" ? ev.index : stepsAcc.length;
              const row: WorkStep = {
                label: ev.label,
                detail: ev.detail,
                status: ev.status ?? "running",
                ms: ev.ms,
              };
              if (stepsAcc[i] && stepsAcc[i].label === ev.label) stepsAcc[i] = { ...stepsAcc[i], ...row };
              else if (stepsAcc[i] && ev.status === "running") stepsAcc[i] = row;
              else stepsAcc.push(row);
              setSteps([...stepsAcc]);
            }
            setStatus("writing");
          }
          if (ev.type === "steps-done") {
            const idx: number[] = Array.isArray(ev.indices) ? ev.indices : [];
            for (const i of idx) {
              if (stepsAcc[i]) stepsAcc[i] = { ...stepsAcc[i], status: ev.status === "failed" ? "failed" : "done" };
            }
            setSteps([...stepsAcc]);
          }
          if (ev.type === "link") {
            if (!linksAcc.some((l) => l.href === ev.href)) {
              linksAcc = [...linksAcc, { label: ev.label, href: ev.href }];
              setLinks(linksAcc);
            }
          }
          if (ev.type === "artifact") {
            artifactAcc = { html: ev.html, title: ev.title };
            setArtifact(artifactAcc);
          }
          if (ev.type === "done") {
            acc = ev.text || acc;
            setAnswer(acc);
          }
          if (ev.type === "error") {
            setError(ev.error || "Something went wrong.");
            setStatus("error");
          }
        }
      }

      if (acc.trim()) {
        setMessages((m) => [...m, {
          role: "assistant",
          content: acc.trim(),
          steps: stepsAcc.length ? stepsAcc : undefined,
          links: linksAcc.length ? linksAcc : undefined,
          artifact: artifactAcc ?? undefined,
        }]);
        setStatus("done");
        setAnswer("");
        setTrace("");
        onComplete?.();
        router.refresh();
      } else if (!error) {
        setStatus("idle");
      }
    } catch (e: any) {
      if (e?.name === "AbortError") {
        if (acc.trim()) setMessages((m) => [...m, {
          role: "assistant", content: acc.trim(),
          steps: stepsAcc.length ? stepsAcc : undefined,
        }]);
        setStatus("idle");
      } else {
        setError(e?.message || "Network hiccup — try again.");
        setStatus("error");
      }
    } finally {
      setAnswer("");
      setTrace("");
      abortRef.current = null;
      setElapsed(0);
      setTimeout(() => setStatus((s) => (s === "done" ? "idle" : s)), 400);
    }
  }

  const starters = [
    "A streetwear label in Nairobi, monthly drops",
    "What should I sell first?",
    "Build my landing page",
  ];

  return (
    <div className={`a ${compact ? "a-compact" : ""}`}>
      <div className="a-scroll" ref={scrollRef}>
        <div className="a-thread">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div className="a-turn a-me" key={i}>
                <div className="a-bubble a-bubble-me">{m.content}</div>
              </div>
            ) : (
              <div className="a-turn" key={i}>
                <div className="a-ava"><GlowCloud /></div>
                <div className="a-bubble">
                  {m === messages[0] ? (
                    <>
                      <b>Hi, I&apos;m Milo. What are we building?</b>
                      <span className="sub">One sentence is enough. I&apos;ll build the site, the brand and the outreach.</span>
                    </>
                  ) : (
                    <>
                      {/* Work replayed from the database, so a reload still shows
                          what Milo actually did — not just what it said. */}
                      {m.steps?.length ? <WorkLog rows={m.steps} collapsed /> : null}
                      <RichText text={m.content} />
                      {m.artifact ? <SitePreview html={m.artifact.html} title={m.artifact.title} /> : null}
                      {m.links?.length ? <LinkChips links={m.links} /> : null}
                    </>
                  )}
                </div>
              </div>
            )
          )}

          {/* live work — the honest version of a loading state */}
          {busy && (
            <div className="a-turn">
              <div className="a-ava"><GlowCloud /></div>
              <div className="a-work">
                <div className="a-work-head">
                  <span className="a-dot" />
                  <span>
                    {status === "connecting" && "Reading your message"}
                    {status === "thinking" && "Thinking it through"}
                    {status === "writing" && "Writing the answer"}
                  </span>
                  <span className="clock">{elapsed}s</span>
                </div>

                {/* The work panel: every tool Milo reaches for, live. */}
                {steps.length > 0 && <WorkLog rows={steps} />}

                {answer ? (
                  <div className="a-bubble a-bubble-live">
                    <RichText text={answer} />
                    <span className="a-caret" />
                  </div>
                ) : steps.length === 0 ? (
                  <p className="a-trace-label">
                    {elapsed < 3
                      ? "Milo is picking up your message…"
                      : "Working out what to do…"}
                  </p>
                ) : null}

                {/* A built page is visible the moment it exists. */}
                {artifact && <SitePreview html={artifact.html} title={artifact.title} />}

                {links.length > 0 && <LinkChips links={links} />}

                {trace && !answer && (
                  <button className="a-trace-btn" onClick={() => setShowTrace((v) => !v)}>
                    {showTrace ? "Hide" : "Show"} Milo&apos;s thinking
                  </button>
                )}
                {trace && showTrace && !answer && (
                  <div className="a-trace">{trace.slice(-900)}</div>
                )}

                <button className="a-stop" onClick={stop}>Stop</button>
              </div>
            </div>
          )}

          {error && (
            <div className="a-turn">
              <div className="a-ava">!</div>
              <div className="a-bubble a-bubble-err">
                <b>That didn&apos;t go through.</b>
                <span>{error}</span>
                <span className="sub">Nothing was saved. Try again, or use a built-in task from the sidebar.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="a-composer-wrap">
        {messages.length <= 1 && !busy && (
          <div className="a-starters">
            {starters.map((s) => (
              <button key={s} className="a-chip" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}

        <form
          className="a-composer"
          onSubmit={(e) => { e.preventDefault(); send(); }}
        >
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Message Milo…"
            aria-label="Message Milo"
          />
          <button
            className={`a-send${input.trim() && !busy ? " ready" : ""}`}
            type="submit"
            disabled={!input.trim() || busy}
            aria-label="Send"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
          </button>
        </form>
        <p className="a-hint-line">Enter to send · Shift+Enter for a new line · nothing publishes without your OK</p>
      </div>
    </div>
  );
}

/**
 * The visible work log.
 *
 * This is the answer to "make it you can see it while it's working": each tool
 * Milo reaches for is a row that moves running -> done, with the real result and
 * the time it took. Persisted with the message, so it survives a reload.
 */
function WorkLog({ rows, collapsed = false }: { rows: WorkStep[]; collapsed?: boolean }) {
  const [open, setOpen] = useState(!collapsed);
  const done = rows.filter((r) => r.status === "done").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const running = rows.some((r) => r.status === "running");

  return (
    <div className="a-worklog">
      <button className="a-worklog-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className={`a-step-dot ${running ? "run" : failed ? "bad" : "ok"}`} />
        <span>
          {running ? "Working" : failed ? `${done} done, ${failed} failed` : `${done} step${done === 1 ? "" : "s"} done`}
        </span>
        <span className="a-worklog-chev">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <ol className="a-steps">
          {rows.map((r, i) => (
            <li key={i} className={`a-step ${r.status}`}>
              <span className={`a-step-dot ${r.status === "running" ? "run" : r.status === "done" ? "ok" : "bad"}`} />
              <span className="a-step-label">{r.label}</span>
              {r.detail && <span className="a-step-detail">{r.detail}</span>}
              {typeof r.ms === "number" && r.ms > 400 && <span className="a-step-ms">{(r.ms / 1000).toFixed(1)}s</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Links Milo produced: connect a tool, view a live site, open Documents. */
function LinkChips({ links }: { links: { label: string; href: string }[] }) {
  return (
    <div className="a-links">
      {links.map((l) => (
        <a key={l.href} className="a-link-chip" href={l.href} target="_blank" rel="noreferrer">
          {l.label}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 17L17 7M9 7h8v8" />
          </svg>
        </a>
      ))}
    </div>
  );
}

/** A built page, rendered inline the moment it exists. Sandboxed with no grants. */
function SitePreview({ html, title }: { html: string; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="a-preview">
      <button className="a-preview-head" onClick={() => setOpen((v) => !v)}>
        <span>Preview · {title}</span>
        <span className="a-worklog-chev">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <iframe
          title={`Preview of ${title}`}
          srcDoc={html}
          sandbox=""
          className="a-preview-frame"
        />
      )}
    </div>
  );
}

const looksLikeCode = (t: string) =>
  /^\s*<!DOCTYPE html|<html[\s>]|^\s*```|<\/html>/i.test(t.trim().slice(0, 200));

/** Minimal markdown: paragraphs, bold, bullets. No dangerouslySetInnerHTML. */
function RichText({ text }: { text: string }) {
  if (looksLikeCode(text)) {
    const isHtml = /<html[\s>]|<!DOCTYPE/i.test(text);
    return (
      <>
        <p>
          <b>{isHtml ? "That came back as a full page, not a chat reply." : "That came back as code."}</b>
        </p>
        <p className="sub" style={{ marginTop: 0 }}>
          Milo should answer in plain language here — the page itself belongs in Build.
        </p>
        <details className="a-trace">
          <summary>Show the raw output</summary>
          <pre>{text.slice(0, 4000)}</pre>
        </details>
      </>
    );
  }
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim());
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l));
        if (isList) {
          return (
            <ul key={bi} className="">
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return <p key={bi}>{inline(block)}</p>;
      })}
    </>
  );
}

function inline(s: string) {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>
  );
}

/** Loads the real thread from Supabase for the full-page chat. */
export function useMiloHistory() {
  const [history, setHistory] = useState<ChatMsg[] | null>(null);
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setHistory([]); return; }
      const { data } = await supabase
        .from("milo_messages")
        .select("id,role,content,steps")
        .order("created_at", { ascending: true })
        .limit(60);
      setHistory(
        (data ?? []).map((r: any) => ({
          role: r.role,
          content: r.content,
          id: r.id,
          steps: Array.isArray(r.steps) && r.steps.length ? r.steps : undefined,
        })) as ChatMsg[]
      );
    })();
  }, []);
  return history;
}
