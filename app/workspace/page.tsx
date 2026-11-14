"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCapability } from "@/lib/capabilities";
import CapabilityRunner from "@/components/CapabilityRunner";
import AppFrame from "@/components/app/AppFrame";
import ChatShell, { type ChatMsg } from "@/components/app/ChatShell";
import Onboarding from "@/components/app/Onboarding";
import { GlowCloud } from "@/components/marketing/Mascot";

type Task = { id: string; title: string; status: string; environment: string; credit_cost: number; created_at: string; kind: string };
type Me = { credits: number; plan: string; business_name: string | null };

const TAG: Record<string, { cls: string; label: string }> = {
  done: { cls: "ok", label: "Done" },
  needs_approval: { cls: "wait", label: "Needs OK" },
  running: { cls: "go", label: "Running" },
  queued: { cls: "go", label: "Queued" },
  rejected: { cls: "wait", label: "Rejected" },
  failed: { cls: "wait", label: "Failed" },
};

export default function Page() {
  return (
    <Suspense fallback={<div className="app"><div className="a-screen"><div className="a-splash"><GlowCloud className="a-cloud" /></div></div></div>}>
      <Workspace />
    </Suspense>
  );
}

function Workspace() {
  const params = useSearchParams();
  const selected = getCapability(params.get("run") || "");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [ready, setReady] = useState(false);
  const [firstRun, setFirstRun] = useState(false);
  const [kicked, setKicked] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setReady(true); return; }
    const [{ data: t }, { data: p }, { data: m }] = await Promise.all([
      supabase.from("tasks").select("id,title,status,environment,credit_cost,created_at,kind").order("created_at", { ascending: false }).limit(6),
      supabase.from("profiles").select("credits,plan,business_name").eq("id", user.id).maybeSingle(),
      supabase.from("milo_messages").select("id,role,content").order("created_at", { ascending: true }).limit(40),
    ]);
    setTasks((t as Task[]) ?? []);
    setMe(p as any);
    const msgs = (m ?? []).map((r: any) => ({ role: r.role, content: r.content, id: r.id })) as ChatMsg[];
    setHistory(msgs);
    setFirstRun(msgs.length === 0 && !(p as any)?.business_name);
    setReady(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  // A first idea typed on the onboarding screen opens the thread with it.
  function startFromIdea(idea: string) {
    setKicked(idea);
    setFirstRun(false);
  }

  if (!ready) {
    return (
      <AppFrame bare>
        <div className="a-screen"><div className="a-splash"><GlowCloud className="a-cloud" /></div></div>
      </AppFrame>
    );
  }

  // First run: the reference's onboarding, one decision per screen.
  // A deep link (?run=...) skips it — that is an explicit instruction.
  if (firstRun && !kicked && !selected) {
    return (
      <AppFrame bare>
        <Onboarding onIdea={startFromIdea} />
      </AppFrame>
    );
  }

  const pending = tasks.filter((t) => t.status === "needs_approval");

  // The conversation is the product. Same surface for first message and later.
  return (
    <AppFrame
      title={me?.business_name || "Milo"}
      subtitle={pending.length ? `${pending.length} waiting on your OK` : "Your AI employee"}
      credits={me ? me.credits : null}
      back="/"
      showBack
    >
      {selected && (
        <div style={{ padding: "10px 14px 0" }}>
          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(255,255,255,.4)" }}>
                Running · {selected.title}
              </span>
              <Link href="/workspace" style={{ fontSize: 12.5, color: "rgba(255,255,255,.45)" }}>Close</Link>
            </div>
            <CapabilityRunner capability={selected} onComplete={load} />
          </div>
        </div>
      )}

      <ChatShell
        business={me?.business_name ?? null}
        initial={history}
        autoSend={kicked || undefined}
        onComplete={load}
      />

      {!selected && (pending.length > 0 || tasks.length > 0) && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,.07)", padding: "10px 14px calc(10px + env(safe-area-inset-bottom))" }}>
          <div style={{ maxWidth: 620, margin: "0 auto", display: "flex", gap: 8, overflowX: "auto" }}>
            {pending.map((t) => (
              <Link key={t.id} href={t.environment === "run" ? "/workspace/run" : "/workspace/build"} className="a-pill" style={{ textDecoration: "none" }}>
                <span className="a-tag wait">Needs OK</span>
                {t.title}
              </Link>
            ))}
            {pending.length === 0 && tasks.slice(0, 3).map((t) => (
              <span key={t.id} className="a-pill">
                <span className={`a-tag ${TAG[t.status]?.cls ?? "go"}`}>{TAG[t.status]?.label ?? t.status}</span>
                {t.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </AppFrame>
  );
}
