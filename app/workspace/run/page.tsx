"use client";
import { useEffect, useState } from "react";
import { CAPABILITIES } from "@/lib/capabilities";
import { createClient } from "@/lib/supabase/client";
import CapabilityRunner from "@/components/CapabilityRunner";

type Automation = { id: string; name: string; kind: string; cadence_hours: number; autopilot: boolean; enabled: boolean; next_run_at: string };
type Task = { id: string; title: string; status: string; kind: string; result: any; created_at: string };

const TEMPLATES = [
  { name: "Weekly business review", kind: "report.weekly", cadence_hours: 168 },
  { name: "Monthly competitor check", kind: "research.competitors", cadence_hours: 720 },
  { name: "Quarterly outreach refresh", kind: "outreach.draft", cadence_hours: 2160 },
];

export default function RunPage() {
  const caps = CAPABILITIES.filter((c) => c.env === "run");
  const [open, setOpen] = useState(caps[0].kind);
  const [autos, setAutos] = useState<Automation[]>([]);
  const [pending, setPending] = useState<Task[]>([]);
  const active = caps.find((c) => c.kind === open)!;

  async function load() {
    const supabase = createClient();
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from("automations").select("*").order("created_at", { ascending: false }),
      supabase.from("tasks").select("id,title,status,kind,result,created_at").eq("status", "needs_approval").order("created_at", { ascending: false }),
    ]);
    setAutos(a ?? []); setPending((p as Task[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function addAutomation(t: (typeof TEMPLATES)[number]) {
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
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, decision }),
    });
    load();
  }

  return (
    <div className="page">
      <div className="spread">
        <div>
          <span className="eyebrow">Run</span>
          <h1 style={{ margin: "2px 0 0", fontSize: 22 }}>Milo keeps working</h1>
          <p className="small muted" style={{ margin: "3px 0 0" }}>Marketing, outreach, support and reviews — on a schedule, with approval gates where it matters.</p>
        </div>
        <div className="seg">
          {caps.map((c) => (
            <button key={c.kind} className={open === c.kind ? "on" : ""} onClick={() => setOpen(c.kind)}>{c.title}</button>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 12, gridTemplateColumns: "minmax(300px, 1fr) minmax(320px, 1fr)" }}>
        <CapabilityRunner capability={active} onComplete={load} />

        <div className="stack">
          <div className="card">
            <div className="card-head"><span>Awaiting your approval</span><span className="go">{pending.length}</span></div>
            {pending.length === 0 ? (
              <p className="small muted card-pad" style={{ margin: 0 }}>Nothing waiting. Good.</p>
            ) : (
              <div className="rows">
                {pending.map((t) => (
                  <div key={t.id} className="row-item" style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 13 }}>{t.result?.title || t.title}</strong>
                      <div className="meta">{t.result?.summary}</div>
                      <div className="row" style={{ marginTop: 7, gap: 6 }}>
                        <button className="btn btn-sm btn-good" onClick={() => decide(t.id, "approve")}>Approve</button>
                        <button className="btn btn-sm btn-bad" onClick={() => decide(t.id, "reject")}>Reject</button>
                      </div>
                    </div>
                    <span className="badge badge-wait">not sent</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head"><span>Scheduled work</span><span className="go">Autopilot off by default</span></div>
            <div className="card-pad" style={{ paddingBottom: 10 }}>
              <div className="row" style={{ gap: 6 }}>
                {TEMPLATES.map((t) => (
                  <button key={t.name} className="chip" style={{ cursor: "pointer", fontSize: 11.5 }} onClick={() => addAutomation(t)}>+ {t.name}</button>
                ))}
              </div>
            </div>
            {autos.length === 0 ? (
              <p className="small muted card-pad" style={{ margin: 0, paddingTop: 0 }}>No automations yet.</p>
            ) : (
              <div className="rows">
                {autos.map((a) => (
                  <div key={a.id} className="row-item">
                    <div>
                      <strong style={{ fontSize: 13 }}>{a.name}</strong>
                      <div className="meta">every {Math.round(a.cadence_hours / 24)} days · next {new Date(a.next_run_at).toLocaleDateString()}</div>
                    </div>
                    <div className="row" style={{ gap: 5 }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => toggle(a.id, "autopilot", !a.autopilot)}
                        style={a.autopilot ? { background: "var(--good)", color: "#fff", borderColor: "var(--good)" } : undefined}>
                        Autopilot {a.autopilot ? "on" : "off"}
                      </button>
                      <button className="btn btn-sm btn-ghost" onClick={() => toggle(a.id, "enabled", !a.enabled)}>
                        {a.enabled ? "Pause" : "Resume"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
