"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppFrame from "@/components/app/AppFrame";
import { GlowCloud } from "@/components/marketing/Mascot";

type Goal = {
  id: string; goal: string; why: string | null; cadence_hours: number;
  status: string; next_run_at: string; last_run_at: string | null; runs: number;
};
type RunStep = { label: string; detail?: string; status: string; ms?: number };
type Run = {
  id: string; goal_id: string | null; trigger: string; summary: string | null;
  status: string; started_at: string; finished_at: string | null; steps: RunStep[];
};
type Autonomy = { enabled: boolean; last_run_at: string | null; last_run_status: string | null };

const CADENCE: { label: string; hours: number }[] = [
  { label: "every 6 hours", hours: 6 },
  { label: "daily", hours: 24 },
  { label: "every 3 days", hours: 72 },
  { label: "weekly", hours: 168 },
];

function when(iso: string | null) {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) {
    const ahead = Math.abs(ms);
    if (ahead < 3600_000) return `in ${Math.round(ahead / 60_000)}m`;
    return `in ${Math.round(ahead / 3600_000)}h`;
  }
  if (ms < 60_000) return "just now";
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

export default function Autopilot() {
  const [autonomy, setAutonomy] = useState<Autonomy>({ enabled: false, last_run_at: null, last_run_status: null });
  const [goals, setGoals] = useState<Goal[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [goal, setGoal] = useState("");
  const [why, setWhy] = useState("");
  const [cadence, setCadence] = useState(24);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/milo/goals");
    if (res.ok) {
      const j = await res.json();
      setAutonomy(j.autonomy ?? { enabled: false, last_run_at: null, last_run_status: null });
      setGoals(j.goals ?? []);
      setRuns(j.runs ?? []);
    }
    setReady(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle() {
    setBusy(true);
    const next = !autonomy.enabled;
    await fetch("/api/milo/goals", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "autonomy", enabled: next }),
    });
    setAutonomy((a) => ({ ...a, enabled: next }));
    setBusy(false);
    setMsg(next ? "Autopilot on. Milo will work between visits." : "Autopilot off. Milo waits for you.");
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim()) return;
    setBusy(true);
    const res = await fetch("/api/milo/goals", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "add", goal, why, cadence_hours: cadence }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); setMsg(j.error || "Could not save that."); return; }

    setGoal(""); setWhy("");
    setMsg("Goal added. Milo will start on the next cycle.");

    // A goal is useless unless autopilot is on, so turn it on — but do it in
    // parallel with the reload. Awaiting the full round trip first left the page
    // showing "Autopilot is off" for a few seconds after the user had just been
    // told a goal was set.
    const needsOn = !autonomy.enabled;
    await Promise.all([
      needsOn
        ? fetch("/api/milo/goals", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ op: "autonomy", enabled: true }),
          })
        : Promise.resolve(),
      load(),
    ]);
    if (needsOn) setAutonomy((a) => ({ ...a, enabled: true }));
    setBusy(false);
  }

  async function setStatus(id: string, status: string) {
    setBusy(true);
    await fetch("/api/milo/goals", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "status", id, status }),
    });
    setBusy(false);
    await load();
  }

  async function remove(id: string) {
    setBusy(true);
    await fetch("/api/milo/goals", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "delete", id }),
    });
    setBusy(false);
    await load();
  }

  /** Run a cycle now — the same code path cron and the visit-tick use. */
  async function runNow() {
    setRunning(true);
    setMsg(null);
    try {
      const res = await fetch("/api/milo/autonomy/tick?force=1", { method: "GET" });
      const j = await res.json().catch(() => ({}));
      setMsg(j.ran ? (j.summary || "Cycle finished.") : (j.reason || j.error || "Nothing to run."));
      await load();
    } finally {
      setRunning(false);
    }
  }

  if (!ready) {
    return (
      <AppFrame bare>
        <div className="a-screen"><div className="a-splash"><GlowCloud className="a-cloud" /></div></div>
      </AppFrame>
    );
  }

  const activeGoals = goals.filter((g) => g.status === "active");

  return (
    <AppFrame title="Autopilot" subtitle={autonomy.enabled ? "Milo works on its own" : "Paused"} back="/workspace" showBack>
      <div className="a-scroll">
        <div style={{ maxWidth: 660, margin: "0 auto", padding: "4px 0 40px" }}>

          {/* ---------- the switch ---------- */}
          <div className={`ap-card ${autonomy.enabled ? "on" : ""}`}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span className={`ap-dot ${autonomy.enabled ? "ok" : "off"}`} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 650 }}>
                  {autonomy.enabled ? "Milo is working on its own" : "Autopilot is off"}
                </div>
                <p className="small muted" style={{ margin: "4px 0 0", lineHeight: 1.55 }}>
                  {autonomy.enabled
                    ? <>Last cycle {when(autonomy.last_run_at)}. It works while you&apos;re away and again whenever a goal comes due.</>
                    : "Turn this on and Milo keeps working between visits. Nothing that leaves Foundly sends without your OK."}
                </p>
              </div>
              <button className={`btn btn-sm ${autonomy.enabled ? "btn-ghost" : ""}`} onClick={toggle} disabled={busy}>
                {busy ? "…" : autonomy.enabled ? "Pause" : "Turn on"}
              </button>
            </div>

            {autonomy.last_run_status && (
              <p className="small" style={{ margin: "10px 0 0", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.08)", color: "rgba(255,255,255,.62)" }}>
                Last: {autonomy.last_run_status}
              </p>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button className="btn btn-sm btn-ghost" onClick={runNow} disabled={running || !activeGoals.length}>
                {running ? "Working…" : "Run a cycle now"}
              </button>
              <Link className="btn btn-sm btn-ghost" href="/workspace/docs">Documents</Link>
              <Link className="btn btn-sm btn-ghost" href="/workspace">Back to Milo</Link>
            </div>
            {/* Don't echo the status line we already show above the buttons. */}
            {msg && msg !== autonomy.last_run_status && (
              <p className="small" style={{ margin: "10px 0 0", color: "rgba(255,255,255,.72)" }}>{msg}</p>
            )}
          </div>

          {/* ---------- what Milo is working towards ---------- */}
          <h2 className="ap-h2">Standing goals</h2>
          <p className="small muted" style={{ margin: "0 0 12px" }}>
            These are what Milo works on by itself. Say &ldquo;keep working on X&rdquo; in chat and it adds one.
          </p>

          {activeGoals.length === 0 && (
            <div className="ap-empty">
              <b>No goals yet.</b>
              <span className="small muted" style={{ display: "block", marginTop: 4 }}>
                Add one below, or just tell Milo: <em>&ldquo;keep building my business — figure out what customers want and write the outreach.&rdquo;</em>
              </span>
            </div>
          )}

          {goals.map((g) => (
            <div key={g.id} className="ap-goal">
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{g.goal}</span>
                  <span className={`a-tag ${g.status === "active" ? "ok" : "wait"}`}>{g.status}</span>
                </div>
                {g.why && <p className="small muted" style={{ margin: "3px 0 0" }}>{g.why}</p>}
                <p className="small dim" style={{ margin: "5px 0 0" }}>
                  Every {g.cadence_hours}h · {g.runs} cycle{g.runs === 1 ? "" : "s"} run · next {when(g.next_run_at)}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="ap-mini" onClick={() => setStatus(g.id, g.status === "active" ? "paused" : "active")} disabled={busy}>
                  {g.status === "active" ? "Pause" : "Resume"}
                </button>
                <button className="ap-mini bad" onClick={() => remove(g.id)} disabled={busy}>Delete</button>
              </div>
            </div>
          ))}

          {/* ---------- add one ---------- */}
          <form onSubmit={add} className="ap-card" style={{ marginTop: 14 }}>
            <div style={{ fontSize: 14.5, fontWeight: 650, marginBottom: 8 }}>Give Milo a goal</div>
            <input
              className="input"
              placeholder="e.g. Get the candle shop its first ten orders"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <input
              className="input"
              placeholder="Why it matters (optional)"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select className="input" value={cadence} onChange={(e) => setCadence(Number(e.target.value))} style={{ maxWidth: 190 }}>
                {CADENCE.map((c) => <option key={c.hours} value={c.hours}>{c.label}</option>)}
              </select>
              <button className="btn btn-sm" type="submit" disabled={busy || !goal.trim()}>
                {busy ? "…" : "Add goal"}
              </button>
            </div>
          </form>

          {/* ---------- what it actually did ---------- */}
          <h2 className="ap-h2">What Milo did on its own</h2>
          {runs.length === 0 && (
            <p className="small muted">Nothing yet. Run a cycle or come back after one is due.</p>
          )}

          {runs.map((r) => (
            <div key={r.id} className="ap-run">
              <div className="ap-run-head">
                <span className={`ap-dot ${r.status === "done" ? "ok" : r.status === "failed" ? "bad" : "run"}`} />
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{r.summary || "Working…"}</span>
                <span className="ap-run-when">
                  {r.trigger === "cron" ? "scheduled" : r.trigger === "catch-up" ? "on your visit" : "manual"} · {when(r.started_at)}
                </span>
              </div>
              {Array.isArray(r.steps) && r.steps.length > 0 && (
                <ul className="ap-steps">
                  {r.steps.map((s, i) => (
                    <li key={i} className={`ap-step ${s.status}`}>
                      <span className={`a-step-dot ${s.status === "done" ? "ok" : s.status === "failed" ? "bad" : "run"}`} />
                      <span className="a-step-label">{s.label}</span>
                      {s.detail && <span className="a-step-detail">{s.detail}</span>}
                      {typeof s.ms === "number" && s.ms > 400 && <span className="a-step-ms">{(s.ms / 1000).toFixed(1)}s</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppFrame>
  );
}
