"use client";
import { useEffect, useState } from "react";
import WorkspaceShell from "@/components/WorkspaceShell";
import CapabilityRunner from "@/components/CapabilityRunner";
import { CAPABILITIES } from "@/lib/capabilities";
import { createClient } from "@/lib/supabase/client";

type Automation = {
  id: string; name: string; kind: string; cadence_hours: number;
  autopilot: boolean; enabled: boolean; next_run_at: string;
};
type Task = { id: string; title: string; status: string; kind: string; result: any; created_at: string };

const AUTO_TEMPLATES = [
  { name: "Weekly business review", kind: "report.weekly", cadence_hours: 168 },
  { name: "Monthly competitor check", kind: "research.competitors", cadence_hours: 720 },
  { name: "Quarterly outreach refresh", kind: "outreach.draft", cadence_hours: 2160 },
];

export default function RunEnvironment() {
  const caps = CAPABILITIES.filter((c) => c.env === "run");
  const [open, setOpen] = useState<string>(caps[0].kind);
  const [autos, setAutos] = useState<Automation[]>([]);
  const [pending, setPending] = useState<Task[]>([]);

  async function load() {
    const supabase = createClient();
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from("automations").select("*").order("created_at", { ascending: false }),
      supabase.from("tasks").select("id,title,status,kind,result,created_at").eq("status", "needs_approval").order("created_at", { ascending: false }),
    ]);
    setAutos(a ?? []);
    setPending((p as Task[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function addAutomation(t: (typeof AUTO_TEMPLATES)[number]) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("automations").insert({
      user_id: user.id, name: t.name, kind: t.kind, cadence_hours: t.cadence_hours,
      autopilot: false, enabled: true, next_run_at: new Date(Date.now() + t.cadence_hours * 3600e3).toISOString(),
    });
    load();
  }

  async function toggle(id: string, field: "enabled" | "autopilot", value: boolean) {
    const supabase = createClient();
    await supabase.from("automations").update({ [field]: value }).eq("id", id);
    load();
  }

  async function decide(taskId: string, decision: "approve" | "reject") {
    await fetch("/api/tasks/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, decision }),
    });
    load();
  }

  return (
    <WorkspaceShell>
      <p style={{ color: "#666", textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 700, margin: 0 }}>Run · operate the business</p>
      <h1 style={{ margin: "6px 0 4px" }}>Milo keeps working</h1>
      <p style={{ color: "#555", marginTop: 0 }}>Marketing, outreach, support and reviews — on a schedule, with approval gates where it matters.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, marginTop: 16 }}>
        {caps.map((c) => (
          <button key={c.kind} onClick={() => setOpen(c.kind)} style={{
            textAlign: "left", padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600,
            border: open === c.kind ? "1px solid #111" : "1px solid #eee", background: open === c.kind ? "#111" : "#fff",
            color: open === c.kind ? "#fff" : "#111",
          }}>{c.title}</button>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        {caps.filter((c) => c.kind === open).map((c) => <CapabilityRunner key={c.kind} capability={c} onComplete={load} />)}
      </div>

      <h2 style={{ marginTop: 32, fontSize: 18 }}>Scheduled automations</h2>
      <p style={{ color: "#555", marginTop: 0, fontSize: 14 }}>Autopilot lets Milo run these without asking. Off by default — turn it on per automation.</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {AUTO_TEMPLATES.map((t) => (
          <button key={t.name} onClick={() => addAutomation(t)} style={{ background: "#fff", border: "1px solid #ddd", padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            + {t.name}
          </button>
        ))}
      </div>

      {autos.length === 0 ? <p style={{ color: "#888" }}>No automations yet.</p> : (
        <div style={{ border: "1px solid #eee", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
          {autos.map((a, i) => (
            <div key={a.id} style={{ padding: "12px 16px", borderTop: i ? "1px solid #f2f2f2" : "none", display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
              <div>
                <strong style={{ fontSize: 14 }}>{a.name}</strong>
                <div style={{ fontSize: 12, color: "#888" }}>every {Math.round(a.cadence_hours / 24)} days · next run {new Date(a.next_run_at).toLocaleDateString()}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => toggle(a.id, "autopilot", !a.autopilot)} style={{ background: a.autopilot ? "#0a6" : "#f4f4f4", color: a.autopilot ? "#fff" : "#333", border: 0, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Autopilot {a.autopilot ? "on" : "off"}
                </button>
                <button onClick={() => toggle(a.id, "enabled", !a.enabled)} style={{ background: "#fff", border: "1px solid #ddd", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {a.enabled ? "Pause" : "Resume"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginTop: 32, fontSize: 18 }}>Awaiting approval ({pending.length})</h2>
      {pending.length === 0 ? <p style={{ color: "#888" }}>Nothing waiting. Good.</p> : (
        <div style={{ display: "grid", gap: 10 }}>
          {pending.map((t) => (
            <div key={t.id} style={{ border: "1px solid #ffe0b2", background: "#fffbf5", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                <strong>{t.result?.title || t.title}</strong>
                <span style={{ fontSize: 12, color: "#b26a00", fontWeight: 700 }}>Drafted {new Date(t.created_at).toLocaleString()}</span>
              </div>
              <p style={{ color: "#555", margin: "6px 0 0", fontSize: 14 }}>{t.result?.summary}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => decide(t.id, "approve")} style={{ background: "#0a6", color: "#fff", border: 0, padding: "8px 14px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Approve &amp; release</button>
                <button onClick={() => decide(t.id, "reject")} style={{ background: "#fff", color: "#b00", border: "1px solid #f0c0c0", padding: "8px 14px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}
