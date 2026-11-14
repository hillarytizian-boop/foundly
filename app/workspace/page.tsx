"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CAPABILITIES, getCapability } from "@/lib/capabilities";
import CapabilityRunner from "@/components/CapabilityRunner";
import AppFrame from "@/components/app/AppFrame";
import ChatShell, { type ChatMsg } from "@/components/app/ChatShell";

type Task = { id: string; title: string; status: string; environment: string; credit_cost: number; created_at: string; kind: string };
type Act = { id: string; message: string; created_at: string };

const TASK_BADGE: Record<string, { cls: string; label: string }> = {
  done: { cls: "ok", label: "Done" },
  needs_approval: { cls: "wait", label: "Needs OK" },
  running: { cls: "go", label: "Running" },
  queued: { cls: "go", label: "Queued" },
  rejected: { cls: "wait", label: "Rejected" },
  failed: { cls: "wait", label: "Failed" },
};

export default function Page() {
  return (
    <Suspense fallback={<div className="page"><p className="muted">Loading…</p></div>}>
      <WorkspaceHome />
    </Suspense>
  );
}

function WorkspaceHome() {
  const params = useSearchParams();
  const selected = getCapability(params.get("run") || "");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [acts, setActs] = useState<Act[]>([]);
  const [me, setMe] = useState<{ credits: number; plan: string; business_name: string | null } | null>(null);
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [ready, setReady] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: t }, { data: a }, { data: p }, { data: m }] = await Promise.all([
      supabase.from("tasks").select("id,title,status,environment,credit_cost,created_at,kind").order("created_at", { ascending: false }).limit(8),
      supabase.from("activity").select("id,message,created_at").order("created_at", { ascending: false }).limit(6),
      supabase.from("profiles").select("credits,plan,business_name").eq("id", user.id).maybeSingle(),
      supabase.from("milo_messages").select("id,role,content").order("created_at", { ascending: true }).limit(40),
    ]);
    setTasks((t as Task[]) ?? []);
    setActs((a as Act[]) ?? []);
    setMe(p as any);
    setHistory((m ?? []).map((r: any) => ({ role: r.role, content: r.content, id: r.id })) as ChatMsg[]);
    setReady(true);
  }
  useEffect(() => { load(); }, []);

  const pending = tasks.filter((t) => t.status === "needs_approval");
  const done = tasks.filter((t) => t.status === "done").length;
  const suggestions = CAPABILITIES.filter((c) => c.env === "home").slice(0, 4);

  return (
    <AppFrame
      title={me?.business_name ? me.business_name : "Your workspace"}
      subtitle={
        pending.length > 0
          ? `${pending.length} waiting on your OK`
          : me?.business_name
            ? "Milo is ready when you are"
            : "Say the idea — Milo takes it from there"
      }
      credits={me ? me.credits : null}
    >
      <div className="app-body">
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          {selected && (
            <div style={{ padding: "12px 16px 0" }}>
              <div style={{ maxWidth: 720, margin: "0 auto" }}>
                <div className="spread" style={{ marginBottom: 8 }}>
                  <span className="eyebrow">Running · {selected.title}</span>
                  <Link href="/workspace" className="small muted">Close</Link>
                </div>
                <CapabilityRunner capability={selected} onComplete={load} />
              </div>
            </div>
          )}

          {ready ? (
            <ChatShell business={me?.business_name ?? null} initial={history} />
          ) : (
            <div className="cs"><div className="cs-scroll"><p className="small muted">Loading your thread…</p></div></div>
          )}
        </div>

        <aside className="app-rail">
          <div className="rail-card">
            <h4>Waiting on you</h4>
            {pending.length === 0 ? (
              <p className="rail-empty">Nothing needs approval.</p>
            ) : (
              pending.map((t) => (
                <Link key={t.id} href={t.environment === "run" ? "/workspace/run" : "/workspace/build"} className="rail-task" style={{ textDecoration: "none", color: "inherit" }}>
                  <span className="grow">{t.title}</span>
                  <span className="rail-pill wait">Review</span>
                </Link>
              ))
            )}
          </div>

          <div className="rail-card">
            <h4>Recent work</h4>
            {tasks.length === 0 ? (
              <p className="rail-empty">Nothing yet — say the idea in chat and Milo starts.</p>
            ) : (
              tasks.slice(0, 5).map((t) => (
                <div key={t.id} className="rail-task">
                  <span className="grow">{t.title}</span>
                  <span className={`rail-pill ${TASK_BADGE[t.status]?.cls ?? "go"}`}>
                    {TASK_BADGE[t.status]?.label ?? t.status}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="rail-card">
            <h4>Ask Milo to</h4>
            {suggestions.map((c) => (
              <Link key={c.kind} href={`/workspace?run=${c.kind}`} className="rail-task" style={{ textDecoration: "none", color: "inherit" }}>
                <span className="grow">{c.title}</span>
                <span style={{ fontSize: 11, color: "rgba(11,18,32,.35)" }}>{c.credits}c</span>
              </Link>
            ))}
            <Link href="/workspace/build" className="rail-task" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="grow">Build the website</span>
              <span style={{ fontSize: 11, color: "rgba(11,18,32,.35)" }}>›</span>
            </Link>
          </div>

          <div className="rail-card">
            <h4>Activity</h4>
            {acts.length === 0 ? (
              <p className="rail-empty">No activity yet.</p>
            ) : (
              acts.slice(0, 4).map((a) => (
                <div key={a.id} className="rail-task">
                  <span className="grow" title={a.message}>{a.message}</span>
                  <span style={{ fontSize: 10.5, color: "rgba(11,18,32,.3)" }}>
                    {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="rail-card" style={{ background: "#fafbfc" }}>
            <h4>Steps done</h4>
            <div style={{ height: 4, borderRadius: 999, background: "rgba(11,18,32,.08)", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, (done / 7) * 100)}%`, height: "100%", background: "#111318" }} />
            </div>
            <p className="rail-empty" style={{ marginTop: 7 }}>{done} of 7 · website, brand, outreach, payments</p>
          </div>
        </aside>
      </div>
    </AppFrame>
  );
}
