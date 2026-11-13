"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import WorkspaceShell from "@/components/WorkspaceShell";
import CapabilityRunner from "@/components/CapabilityRunner";
import { createClient } from "@/lib/supabase/client";
import { CAPABILITIES, getCapability } from "@/lib/capabilities";

type Task = {
  id: string; title: string; status: string; environment: string;
  credit_cost: number; created_at: string; kind: string;
};

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  done: { bg: "#e7f6ee", fg: "#0a6", label: "Done" },
  needs_approval: { bg: "#fff4e5", fg: "#b26a00", label: "Needs approval" },
  running: { bg: "#e8f0fe", fg: "#1a4fd6", label: "Running" },
  queued: { bg: "#f4f4f4", fg: "#555", label: "Queued" },
  rejected: { bg: "#fdecec", fg: "#b00", label: "Rejected" },
  failed: { bg: "#fdecec", fg: "#b00", label: "Failed" },
};

export default function WorkspaceHomePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading…</div>}>
      <WorkspaceHome />
    </Suspense>
  );
}

function WorkspaceHome() {
  const params = useSearchParams();
  const selected = getCapability(params.get("run") || "");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<{ id: string; message: string; created_at: string }[]>([]);
  const [profile, setProfile] = useState<{ credits: number; plan: string; business_name: string | null } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: t }, { data: a }, { data: p }] = await Promise.all([
        supabase.from("tasks").select("id,title,status,environment,credit_cost,created_at,kind").order("created_at", { ascending: false }).limit(12),
        supabase.from("activity").select("id,message,created_at").order("created_at", { ascending: false }).limit(8),
        supabase.from("profiles").select("credits,plan,business_name").eq("id", user.id).maybeSingle(),
      ]);
      setTasks((t as Task[]) ?? []);
      setActivity(a ?? []);
      setProfile(p as any);
    })();
  }, []);

  const pending = tasks.filter((t) => t.status === "needs_approval");
  const done = tasks.filter((t) => t.status === "done").length;
  const suggestions = CAPABILITIES.filter((c) => c.env === "home").slice(0, 4);

  return (
    <WorkspaceShell>
      <p style={{ color: "#666", textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 700, margin: 0 }}>Home · command centre</p>
      <h1 style={{ margin: "6px 0 4px" }}>{profile?.business_name ? `Milo's work on ${profile.business_name}` : "Your business, in Milo's hands"}</h1>
      <p style={{ color: "#555", marginTop: 0 }}>Everything Milo is doing, everything waiting on you, and what he suggests next.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 20 }}>
        {[
          ["Credits", profile ? String(profile.credits) : "—"],
          ["Plan", profile?.plan ?? "—"],
          ["Tasks done", String(done)],
          ["Waiting on you", String(pending.length)],
        ].map(([k, v]) => (
          <div key={k} style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, background: "#fff" }}>
            <div style={{ fontSize: 12, color: "#777", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{k}</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, textTransform: "capitalize" }}>{v}</div>
          </div>
        ))}
      </div>

      {selected && (
        <section style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>Run: {selected.title}</h2>
            <Link href="/workspace" style={{ fontSize: 13, color: "#666" }}>Close</Link>
          </div>
          <div style={{ marginTop: 10 }}>
            <CapabilityRunner capability={selected} onComplete={() => window.location.reload()} />
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18 }}>Waiting for your approval</h2>
          <p style={{ color: "#555", marginTop: 0, fontSize: 14 }}>Milo drafted these. Nothing leaves Foundly until you say so.</p>
          {pending.map((t) => (
            <div key={t.id} style={{ border: "1px solid #ffe0b2", background: "#fffbf5", borderRadius: 10, padding: 14, marginBottom: 8, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div><strong>{t.title}</strong><div style={{ fontSize: 13, color: "#777" }}>{t.environment} · {new Date(t.created_at).toLocaleString()}</div></div>
              <Link href={t.environment === "run" ? "/workspace/run" : "/workspace/build"} style={{ background: "#111", color: "#fff", padding: "8px 14px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Review</Link>
            </div>
          ))}
        </section>
      )}

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18 }}>Recent work</h2>
        {tasks.length === 0 ? (
          <p style={{ color: "#888" }}>Nothing yet. Pick something to start with below — Milo will do the first pass.</p>
        ) : (
          <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
            {tasks.map((t, i) => {
              const s = STATUS_STYLE[t.status] ?? STATUS_STYLE.queued;
              return (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderTop: i ? "1px solid #f2f2f2" : "none", alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>{t.title}</strong>
                    <div style={{ fontSize: 12, color: "#888" }}>{t.environment} · {t.credit_cost} credits · {new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                  <span style={{ background: s.bg, color: s.fg, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18 }}>Start something</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {suggestions.map((c) => (
            <Link key={c.kind} href={`/workspace?run=${c.kind}`} style={{ textDecoration: "none", color: "inherit", border: "1px solid #eee", borderRadius: 12, padding: 16, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#777", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{c.category}</div>
              <strong style={{ display: "block", margin: "4px 0" }}>{c.title}</strong>
              <span style={{ fontSize: 13, color: "#666" }}>{c.blurb}</span>
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18 }}>Activity</h2>
        {activity.length === 0 ? <p style={{ color: "#888" }}>No activity yet.</p> : (
          <ul style={{ paddingLeft: 18, color: "#444", lineHeight: 1.8, fontSize: 14 }}>
            {activity.map((a) => <li key={a.id}>{a.message} <span style={{ color: "#999" }}>· {new Date(a.created_at).toLocaleString()}</span></li>)}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 28, border: "1px solid #eee", borderRadius: 12, padding: 16, background: "#fafafa" }}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Talk to Milo</h2>
        <p style={{ color: "#555", marginTop: 0, fontSize: 14 }}>Describe the outcome you want and Milo will pick the right tools.</p>
        <Link href="/line" style={{ background: "#111", color: "#fff", padding: "10px 16px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Open the chat</Link>
      </section>
    </WorkspaceShell>
  );
}
