"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CAPABILITIES, getCapability } from "@/lib/capabilities";
import CapabilityRunner from "@/components/CapabilityRunner";

type Task = { id: string; title: string; status: string; environment: string; credit_cost: number; created_at: string; kind: string };
type Act = { id: string; message: string; created_at: string };

const BADGE: Record<string, string> = {
  done: "badge badge-done", needs_approval: "badge badge-wait", running: "badge badge-run",
  queued: "badge badge-idle", rejected: "badge badge-bad", failed: "badge badge-bad",
};
const LABEL: Record<string, string> = {
  done: "Done", needs_approval: "Needs OK", running: "Running", queued: "Queued", rejected: "Rejected", failed: "Failed",
};

export default function Page() {
  return <Suspense fallback={<div className="page"><p className="muted">Loading…</p></div>}><Home /></Suspense>;
}

function Home() {
  const params = useSearchParams();
  const selected = getCapability(params.get("run") || "");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [acts, setActs] = useState<Act[]>([]);
  const [me, setMe] = useState<{ credits: number; plan: string; business_name: string | null } | null>(null);
  const [chat, setChat] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: t }, { data: a }, { data: p }] = await Promise.all([
      supabase.from("tasks").select("id,title,status,environment,credit_cost,created_at,kind").order("created_at", { ascending: false }).limit(8),
      supabase.from("activity").select("id,message,created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("profiles").select("credits,plan,business_name").eq("id", user.id).maybeSingle(),
    ]);
    setTasks((t as Task[]) ?? []); setActs(a ?? []); setMe(p as any);
  }
  useEffect(() => { load(); }, []);

  async function send() {
    if (!chat.trim() || thinking) return;
    setThinking(true); setReply("Milo is thinking — reasoning models take up to two minutes.");
    const res = await fetch("/api/milo/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: chat, business: me?.business_name ?? undefined }),
    });
    const j = await res.json();
    setReply(j.reply || j.error || "…"); setChat(""); setThinking(false);
  }

  const pending = tasks.filter((t) => t.status === "needs_approval");
  const done = tasks.filter((t) => t.status === "done").length;
  const suggestions = CAPABILITIES.filter((c) => c.env === "home").slice(0, 3);

  return (
    <div className="page">
      {/* greeting strip */}
      <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: 10, background: "linear-gradient(135deg,#eaf4ff,#cfe6ff)", display: "grid", placeItems: "center", fontSize: 15 }}>☁️</div>
        <div>
          <h3 style={{ margin: 0 }}>I&apos;m here when you need me.</h3>
          <p className="small muted" style={{ margin: 0 }}>
            {me?.business_name ? `Working on ${me.business_name}. ` : ""}{pending.length > 0
              ? `${pending.length} thing${pending.length > 1 ? "s" : ""} waiting on your OK.`
              : "Tell me what to work on and I'll get started."}
          </p>
        </div>
      </div>

      {selected && (
        <div style={{ marginTop: 12 }}>
          <div className="spread" style={{ marginBottom: 8 }}>
            <span className="eyebrow">Running · {selected.title}</span>
            <Link href="/workspace" className="small muted">Close</Link>
          </div>
          <CapabilityRunner capability={selected} onComplete={load} />
        </div>
      )}

      {/* stat row */}
      <div className="grid-4" style={{ marginTop: 12 }}>
        {[["Credits", me ? String(me.credits) : "—"], ["Plan", me?.plan ?? "free"], ["Tasks done", String(done)], ["Waiting on you", String(pending.length)]].map(([k, v]) => (
          <div key={k} className="card stat">
            <div className="stat-k">{k}</div>
            <div className="stat-v" style={{ textTransform: "capitalize" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* two column main: left = chat + recent work, right = next steps + shortcuts */}
      <div style={{
        display: "grid", gap: 12, marginTop: 12,
        gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr)", alignItems: "start",
      }}>
        {/* LEFT COLUMN */}
        <div className="stack">
          <div className="card" style={{ display: "flex", flexDirection: "column" }}>
            <div className="card-head">
              <span>From Milo</span>
              <Link href="/line" className="go" title="Open full chat">↗</Link>
            </div>
            <div className="card-pad">
              {!reply && (
                <div style={{ textAlign: "center", padding: "26px 8px", color: "var(--ink-3)" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>🗂️</div>
                  <p className="small" style={{ margin: 0 }}>What Milo makes for you will appear here.</p>
                </div>
              )}
              {reply && <div className="bubble bubble-bot" style={{ maxWidth: "100%" }}>{reply}</div>}
            </div>
            <div style={{ padding: "0 14px 14px" }}>
              <div className="composer">
                <input
                  value={chat} onChange={(e) => setChat(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Message Milo…"
                />
                <button onClick={send} disabled={thinking} aria-label="Send">{thinking ? "…" : "↑"}</button>
              </div>
              <div className="row" style={{ marginTop: 8, gap: 6 }}>
                <Link href="/workspace?run=outreach.draft" className="chip" style={{ fontSize: 11.5 }}>Find my first customers</Link>
                <Link href="/workspace?run=plan.business" className="chip" style={{ fontSize: 11.5 }}>Start taking payments</Link>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><span>Recent work</span><Link href="/workspace/docs" className="go">All ›</Link></div>
            {tasks.length === 0 ? (
              <p className="small muted card-pad" style={{ margin: 0 }}>Nothing yet. Pick a step and Milo starts.</p>
            ) : (
              <div className="rows">
                {tasks.map((t) => (
                  <div key={t.id} className="row-item">
                    <div>
                      <strong style={{ fontSize: 13 }}>{t.title}</strong>
                      <div className="meta">{t.environment} · {t.credit_cost} credits · {new Date(t.created_at).toLocaleDateString()}</div>
                    </div>
                    <span className={BADGE[t.status] ?? "badge badge-idle"}>{LABEL[t.status] ?? t.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="stack">
          {pending.length > 0 && (
            <div className="card">
              <div className="card-head"><span>Waiting for your OK</span><span className="go">{pending.length}</span></div>
              <div className="rows">
                {pending.map((t) => (
                  <div key={t.id} className="row-item">
                    <div>
                      <strong style={{ fontSize: 13 }}>{t.title}</strong>
                      <div className="meta">{t.environment} · {new Date(t.created_at).toLocaleDateString()}</div>
                    </div>
                    <Link className="btn btn-sm" href={t.environment === "run" ? "/workspace/run" : "/workspace/build"}>Review</Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-head"><span>Your next steps</span><span className="go">{done} of 7 complete</span></div>
            <div className="card-pad" style={{ paddingTop: 10 }}>
              <div style={{ height: 5, borderRadius: 999, background: "rgba(15,23,32,0.08)", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, (done / 7) * 100)}%`, height: "100%", background: "var(--ink)", borderRadius: 999 }} />
              </div>
              <div className="stack" style={{ marginTop: 12, gap: 7 }}>
                {[
                  ["Say hi to Milo in chat", "/line", true],
                  ["Build your first site", "/workspace/build", tasks.some((t) => t.kind === "site.generate")],
                  ["Draft your outreach", "/workspace/run", tasks.some((t) => t.kind === "outreach.draft")],
                ].map(([label, href, complete]) => (
                  <Link key={label as string} href={href as string} style={{
                    display: "flex", alignItems: "center", gap: 9, textDecoration: "none", color: "inherit",
                    background: "rgba(255,255,255,0.7)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 11px", fontSize: 13,
                  }}>
                    <span style={{
                      width: 15, height: 15, borderRadius: 999, flex: "0 0 auto",
                      background: complete ? "var(--good)" : "rgba(15,23,32,0.12)",
                      display: "grid", placeItems: "center", color: "#fff", fontSize: 9,
                    }}>{complete ? "✓" : ""}</span>
                    <span style={{ flex: 1 }}>{label as string}</span>
                    <span className="dim">›</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><span>Ready when you are</span><span className="go">Home</span></div>
            <div className="rows">
              {suggestions.map((c) => (
                <Link key={c.kind} href={`/workspace?run=${c.kind}`} className="row-item" style={{ textDecoration: "none", color: "inherit" }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{c.title}</strong>
                    <div className="meta">{c.blurb}</div>
                  </div>
                  <span className="dim">{c.credits}c</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-head"><span>Activity</span><span className="go">Live</span></div>
        {acts.length === 0 ? (
          <p className="small muted card-pad" style={{ margin: 0 }}>No activity yet.</p>
        ) : (
          <div className="rows">
            {acts.map((a) => (
              <div key={a.id} className="row-item" style={{ alignItems: "flex-start" }}>
                <span style={{ fontSize: 12.8, color: "var(--ink-2)" }}>{a.message}</span>
                <span className="meta" style={{ whiteSpace: "nowrap" }}>{new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
