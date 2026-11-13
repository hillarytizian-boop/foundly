"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CapabilityRunner from "@/components/CapabilityRunner";

type Step = { agent: string; role: string; status: "done" | "warning"; summary: string; notes: string[]; ms: number; engine?: "live" | "builtin" };
type Guard = { id: string; rule: string; severity: "block" | "warn"; passed: boolean; detail: string };
type Harness = {
  model: string; skills: string[]; fallbackReason?: string;
  instincts: { id: string; trigger: string; correction: string }[];
  research: { competitorPatterns: string[]; differentiators: string[]; questions: string[] };
};
type Site = {
  id: string; business_name: string; idea: string; slug: string | null; html: string | null;
  published: boolean; agent_run: Step[]; score: number | null; created_at: string;
};

const AGENTS = [
  { name: "Strategist", role: "reads the brief, writes the copy" },
  { name: "Builder", role: "writes HTML + CSS" },
  { name: "Reviewer", role: "audits, fixes, scores" },
  { name: "Publisher", role: "slug, metadata, deploy" },
];

export default function BuildPage() {
  const [brief, setBrief] = useState({ businessName: "", idea: "", audience: "", price: "", vibe: "" });
  const [sites, setSites] = useState<Site[]>([]);
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState<Site | null>(null);
  const [tab, setTab] = useState<"agents" | "tools">("agents");
  const [mode, setMode] = useState<"auto" | "fast">("fast");
  const [guards, setGuards] = useState<Guard[]>([]);
  const [harness, setHarness] = useState<Harness | null>(null);
  const [engine, setEngine] = useState<"live" | "builtin" | null>(null);
  const [model, setModel] = useState<{ configured: boolean; model: string; note: string } | null>(null);

  async function loadSites() {
    const supabase = createClient();
    const { data } = await supabase.from("sites").select("*").order("created_at", { ascending: false }).limit(20);
    const list = (data as Site[]) ?? [];
    setSites(list);
    if (list[0]) setActive((prev) => prev ?? list[0]);
  }
  useEffect(() => {
    loadSites();
    fetch("/api/models/status").then((r) => r.json()).then(setModel).catch(() => {});
  }, []);

  async function refreshSites() {
    const supabase = createClient();
    const { data } = await supabase.from("sites").select("*").order("created_at", { ascending: false }).limit(20);
    const list = (data as Site[]) ?? [];
    setSites(list);
    return list;
  }

  async function build() {
    if (!brief.idea.trim()) { setErr("Tell the agents what the business does."); return; }
    setBusy(true); setErr(null); setSteps([]); setGuards([]); setHarness(null); setEngine(null);

    // stage 1 — Strategist
    const r1 = await fetch("/api/agents/build", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief, mode, stage: "plan" }),
    });
    const j1 = await r1.json();
    if (!r1.ok) { setBusy(false); setErr(j1.error || "Build failed"); return; }

    setSteps(j1.steps ?? []);
    setEngine(j1.engine ?? null);
    if (j1.fallback_reason) setErr(j1.fallback_reason);
    await refreshSites();

    // stage 2 — Builder + Reviewer + Publisher (skipped when stage 1 already finished)
    if (!j1.complete) {
      const r2 = await fetch("/api/agents/build", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, mode, stage: "render", draft_id: j1.draft_id }),
      });
      const j2 = await r2.json();
      if (!r2.ok) { setBusy(false); setErr(j2.error || "The builder failed — the draft is saved, try Build again."); await refreshSites(); return; }
      setSteps([...(j1.steps ?? []), ...(j2.steps ?? [])]);
      setGuards(j2.guardrails ?? []);
      setEngine(j2.engine ?? null);
      if (j2.fallback_reason) setErr(j2.fallback_reason);
    } else {
      setGuards(j1.guardrails ?? []);
      setHarness(j1.harness ?? null);
    }

    const list = await refreshSites();
    setActive(list[0] ?? null);
    setBusy(false);
  }

  async function publish(site: Site, next: boolean) {
    const res = await fetch("/api/sites/publish", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_id: site.id, published: next }),
    });
    const json = await res.json();
    if (!res.ok) { setErr(json.error); return; }
    await loadSites();
    setActive((a) => (a ? { ...a, published: next } : a));
  }

  return (
    <div className="page">
      <div className="spread">
        <div>
          <span className="eyebrow">Build</span>
          <h1 style={{ margin: "2px 0 0", fontSize: 22 }}>A team of coding agents builds your site</h1>
          <p className="small muted" style={{ margin: "3px 0 0" }}>
            Four specialists in sequence, each pulled through the ECC harness (guardrails → research → skills → instincts).
          </p>
          {model && (
            <p className="small" style={{ margin: "3px 0 0", fontWeight: 600, color: model.configured ? "var(--good)" : "var(--ink-3)" }}>
              {model.configured ? `Live model ready · ${model.model}` : "Live model off · built-in team only"}
            </p>
          )}
        </div>
        <div className="seg">
          <button className={tab === "agents" ? "on" : ""} onClick={() => setTab("agents")}>Agent team</button>
          <button className={tab === "tools" ? "on" : ""} onClick={() => setTab("tools")}>Milo&apos;s tools</button>
        </div>
      </div>

      {tab === "tools" ? (
        <div style={{ marginTop: 12 }}>
          <div className="grid-2">
            {["site.generate", "site.update", "brand.logo"].map((k) => (
              <ToolCard key={k} kind={k} onComplete={loadSites} />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid-2" style={{ marginTop: 12, gridTemplateColumns: "minmax(320px, 0.85fr) minmax(340px, 1.15fr)" }}>
          {/* LEFT: brief + agent run */}
          <div className="stack">
            <div className="card card-pad">
              <h3 style={{ marginBottom: 8 }}>The brief</h3>
              <div className="stack" style={{ gap: 8 }}>
                <label className="field"><span>What the business does *</span>
                  <textarea rows={2} value={brief.idea} onChange={(e) => setBrief({ ...brief, idea: e.target.value })}
                    placeholder="handmade candles for Nairobi homes, sold in sets of three" /></label>
                <div className="grid-2" style={{ gap: 8 }}>
                  <label className="field"><span>Business name</span>
                    <input value={brief.businessName} onChange={(e) => setBrief({ ...brief, businessName: e.target.value })} placeholder="Terracotta Supply" /></label>
                  <label className="field"><span>Price point</span>
                    <input value={brief.price} onChange={(e) => setBrief({ ...brief, price: e.target.value })} placeholder="$45 per set" /></label>
                </div>
                <label className="field"><span>Who it&apos;s for</span>
                  <input value={brief.audience} onChange={(e) => setBrief({ ...brief, audience: e.target.value })}
                    placeholder="gift buyers and local boutiques" /></label>
                <label className="field"><span>Vibe</span>
                  <select value={brief.vibe} onChange={(e) => setBrief({ ...brief, vibe: e.target.value })}>
                    <option value="">Clean and warm (default)</option>
                    <option value="premium">Premium — dark, considered</option>
                    <option value="bold">Bold — high contrast</option>
                  </select></label>
                <div className="seg" style={{ width: "100%" }}>
                  <button className={mode === "fast" ? "on" : ""} onClick={() => setMode("fast")}>Fast · built-in</button>
                  <button className={mode === "auto" ? "on" : ""} onClick={() => setMode("auto")}>Live · model</button>
                </div>
                <button className="btn" onClick={build} disabled={busy} style={{ width: "100%" }}>
                  {busy ? "Agents are working…" : "Build with the agent team · 3 credits"}
                </button>
                <p className="small dim" style={{ margin: 0 }}>
                  {mode === "auto"
                    ? "Live: the NVIDIA model plans the copy, then builds the page through the ECC harness (guardrails → research → skills → instincts). One reasoning call per stage, so a build can take 2–5 minutes. If the model is unavailable it falls back to the built-in team and says so — it never fakes a live run."
                    : "Built-in team. Instant, no model calls, same four agents and same guardrails."}
                </p>
                {err && <p className="small" style={{ color: "var(--bad)", margin: 0 }}>{err}</p>}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><span>Agent run</span>
                <span className="go">
                  {engine ? (engine === "live" ? "live model" : "built-in") : `${steps.length ? `${steps.length} agents` : "idle"}`}
                </span></div>
              <div className="rows">
                {(steps.length ? steps : AGENTS.map((a) => ({ agent: a.name, role: a.role, status: "idle" as any, summary: "Waiting to start", notes: [], ms: 0 }))).map((s, i) => (
                  <div key={s.agent} className="row-item" style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div className="row" style={{ gap: 7 }}>
                        <span style={{
                          width: 16, height: 16, borderRadius: 999, flex: "0 0 auto", display: "grid", placeItems: "center",
                          fontSize: 9, color: "#fff", fontWeight: 700,
                          background: s.status === "done" ? "var(--good)" : s.status === "warning" ? "var(--warn)" : "rgba(15,23,32,.14)",
                        }}>{s.status === "done" ? "✓" : s.status === "warning" ? "!" : i + 1}</span>
                        <strong style={{ fontSize: 13 }}>{s.agent}</strong>
                        <span className="dim small">{s.role}</span>
                        {s.ms > 0 && <span className="dim small">· {s.ms}ms</span>}
                      </div>
                      <div className="small muted" style={{ marginTop: 2 }}>{s.summary}</div>
                      {s.notes?.length > 0 && (
                        <ul className="small dim" style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                          {s.notes.map((n, j) => <li key={j}>{n}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: preview */}
          <div className="stack">
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="card-head">
                <span>{active ? `${active.business_name} · /s/${active.slug}` : "Preview"}</span>
                <div className="row" style={{ gap: 6 }}>
                  {active?.score != null && <span className="badge badge-idle">{active.score}/100</span>}
                  {active?.published
                    ? <a className="btn btn-sm btn-ghost" href={`/s/${active.slug}`} target="_blank" rel="noreferrer">Open</a>
                    : active && <button className="btn btn-sm" onClick={() => publish(active, true)}>Publish</button>}
                </div>
              </div>
              {active?.html ? (
                <iframe
                  title="Site preview"
                  srcDoc={active.html}
                  style={{ width: "100%", height: 520, border: 0, background: "#fff", display: "block" }}
                  sandbox=""
                />
              ) : (
                <div className="card-pad" style={{ textAlign: "center", padding: "56px 20px", color: "var(--ink-3)" }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>🧱</div>
                  <h4 style={{ margin: "0 0 3px" }}>The agents haven&apos;t built yet</h4>
                  <p className="small" style={{ margin: 0 }}>Fill the brief and run the team. Their output appears here.</p>
                </div>
              )}
            </div>

            {guards.length > 0 && (
              <div className="card">
                <div className="card-head"><span>Guardrails</span>
                  <span className="go">{guards.filter((g) => g.passed).length}/{guards.length} passed</span></div>
                <div className="rows">
                  {guards.map((g) => (
                    <div key={g.id} className="row-item">
                      <div>
                        <div className="row" style={{ gap: 6 }}>
                          <span style={{ color: g.passed ? "var(--good)" : g.severity === "block" ? "var(--bad)" : "var(--warn)", fontWeight: 700 }}>
                            {g.passed ? "✓" : g.severity === "block" ? "✕" : "!"}
                          </span>
                          <strong style={{ fontSize: 12.5 }}>{g.rule}</strong>
                        </div>
                        <div className="meta">{g.detail}</div>
                      </div>
                      <span className="dim small">{g.id.split(".")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {harness && (
              <div className="card">
                <div className="card-head"><span>Harness</span><span className="go">{harness.model}</span></div>
                <div className="card-pad stack" style={{ gap: 8 }}>
                  <div>
                    <div className="meta">Research it worked from</div>
                    <ul className="small muted" style={{ margin: "2px 0 0", paddingLeft: 16 }}>
                      {harness.research.competitorPatterns.slice(0, 3).map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                  {harness.instincts.length > 0 && (
                    <div>
                      <div className="meta">Instincts that fired</div>
                      <ul className="small muted" style={{ margin: "2px 0 0", paddingLeft: 16 }}>
                        {harness.instincts.map((i) => <li key={i.id}>{i.correction}</li>)}
                      </ul>
                    </div>
                  )}
                  <div>
                    <div className="meta">Skills loaded ({harness.skills.length})</div>
                    <div className="row" style={{ gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                      {harness.skills.slice(0, 8).map((k) => <span key={k} className="badge badge-idle">{k}</span>)}
                    </div>
                  </div>
                  {harness.fallbackReason && (
                    <p className="small" style={{ margin: 0, color: "var(--warn)", fontWeight: 600 }}>{harness.fallbackReason}</p>
                  )}
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-head"><span>Your sites</span><span className="go">{sites.length}</span></div>
              {sites.length === 0 ? (
                <p className="small muted card-pad" style={{ margin: 0 }}>Nothing built yet.</p>
              ) : (
                <div className="rows" style={{ maxHeight: 240, overflowY: "auto" }}>
                  {sites.map((s) => (
                    <button key={s.id} onClick={() => setActive(s)} className="row-item" style={{
                      width: "100%", border: 0, borderTop: "1px solid var(--line)", textAlign: "left",
                      background: active?.id === s.id ? "rgba(255,255,255,.9)" : "transparent", cursor: "pointer", font: "inherit",
                    }}>
                      <div>
                        <strong style={{ fontSize: 13 }}>{s.business_name}</strong>
                        <div className="meta">/s/{s.slug} · {s.score ?? "—"}/100</div>
                      </div>
                      <span className={s.published ? "badge badge-done" : "badge badge-idle"}>
                        {s.published ? "live" : "draft"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolCard({ kind, onComplete }: { kind: string; onComplete: () => void }) {
  const [cap, setCap] = useState<any>(null);
  useEffect(() => {
    import("@/lib/capabilities").then((m) => setCap(m.getCapability(kind)));
  }, [kind]);
  return cap ? <CapabilityRunner capability={cap} onComplete={onComplete} /> : null;
}
