"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CapabilityRunner from "@/components/CapabilityRunner";
import Surface from "@/components/app/Surface";

type Step = { agent: string; role: string; status: "done" | "warning"; summary: string; notes: string[]; ms: number; engine?: "live" | "builtin" };
type Guard = { id: string; rule: string; severity: "block" | "warn"; passed: boolean; detail: string };
type Harness = {
  model: string; skills: string[]; fallbackReason?: string;
  instincts: { id: string; trigger: string; correction: string }[];
  research: { competitorPatterns: string[]; differentiators: string[]; questions: string[] };
};
type Site = {
  id: string; business_name: string; idea: string; slug: string | null; html: string | null;
  published: boolean; agent_run: Step[] | null; score: number | null; created_at: string;
};

const AGENTS = [
  { name: "Strategist", role: "reads the brief, writes the copy" },
  { name: "Builder", role: "writes HTML + CSS" },
  { name: "Reviewer", role: "audits, fixes, scores" },
  { name: "Publisher", role: "slug, metadata, deploy" },
];

/**
 * What the agents are doing right now.
 *
 * The old screen showed "Waiting to start" on all four agents for the whole
 * run, so a two-minute live build looked frozen — the only sign of life was
 * the button's label. Each agent now reports its own state as the orchestrator
 * moves through it.
 */
type Live = { done: string[]; active: string | null; note: string };

const STAGE1_TIMEOUT = 240_000;
const STAGE2_TIMEOUT = 90_000;

export default function BuildPage() {
  const [brief, setBrief] = useState({ businessName: "", idea: "", audience: "", price: "", vibe: "" });
  const [sites, setSites] = useState<Site[]>([]);
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [active, setActive] = useState<Site | null>(null);
  const [tab, setTab] = useState<"agents" | "tools">("agents");
  const [mode, setMode] = useState<"auto" | "fast">("fast");
  const [guards, setGuards] = useState<Guard[]>([]);
  const [harness, setHarness] = useState<Harness | null>(null);
  const [engine, setEngine] = useState<"live" | "builtin" | null>(null);
  const [model, setModel] = useState<{ configured: boolean; model: string; note: string } | null>(null);
  const [live, setLive] = useState<Live>({ done: [], active: null, note: "" });
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSites = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("sites").select("*").order("created_at", { ascending: false }).limit(20);
    const list = (data as Site[]) ?? [];
    setSites(list);
    return list;
  }, []);

  const loadSites = useCallback(async () => {
    const list = await fetchSites();
    setActive((prev) => prev ?? list[0] ?? null);
  }, [fetchSites]);

  useEffect(() => {
    loadSites();
    fetch("/api/models/status").then((r) => r.json()).then(setModel).catch(() => {});
  }, [loadSites]);

  // A visible clock is the cheapest possible proof that work is happening.
  useEffect(() => {
    if (busy) {
      const t0 = Date.now();
      setElapsed(0);
      timer.current = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
    } else if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    return () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } };
  }, [busy]);

  const resetRun = () => {
    setSteps([]); setGuards([]); setHarness(null); setEngine(null);
    setErr(null); setNote(null); setLive({ done: [], active: null, note: "" });
  };

  async function post(url: string, body: unknown, ms: number) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), signal: ctrl.signal,
      });
      const json = await res.json().catch(() => ({}));
      return { res, json };
    } finally {
      clearTimeout(t);
    }
  }

  async function pollRoadmap(draftId: string) {
    // The plan stage writes a roadmap before it starts writing copy. Reading it
    // is what lets the screen say "Strategist is writing" instead of nothing.
    const supabase = createClient();
    const { data } = await supabase.from("sites").select("agent_run").eq("id", draftId).maybeSingle();
    const run = (data as any)?.agent_run;
    if (Array.isArray(run) && run.length) setSteps(run as Step[]);
  }

  async function build() {
    if (!brief.idea.trim()) { setErr("Tell the agents what the business does."); return; }
    setBusy(true); resetRun();

    const live0 = mode === "auto";
    setLive({
      done: [],
      active: "Strategist",
      note: live0 ? "Waking the model — this stage takes 1–4 minutes." : "Writing the copy.",
    });
    setNote(live0
      ? "Live model: the Strategist is a reasoning call, then the Builder, Reviewer and Publisher run here. Stages report as they land."
      : "Built-in team running. Instant, no model calls.");

    try {
      // ---- stage 1: Strategist ----
      let j1: any;
      try {
        const { res, json } = await post("/api/agents/build", { brief, mode, stage: "plan" }, STAGE1_TIMEOUT);
        if (!res.ok) {
          setBusy(false);
          setErr(json.error || `The plan stage failed (HTTP ${res.status}).`);
          await fetchSites();
          return;
        }
        j1 = json;
      } catch (e: any) {
        setBusy(false);
        setErr(e?.name === "AbortError"
          ? "The model didn't answer in 4 minutes. Nothing was charged twice — the draft (if any) is saved; press Build again to continue."
          : "Could not reach the build service. Check your connection and try again.");
        await fetchSites();
        return;
      }

      setSteps(j1.steps ?? []);
      setEngine(j1.engine ?? null);
      // A live run that fell back is reported as a notice, not as a failure:
      // the page is real, only the engine changed, and it says which one.
      if (j1.fallback_reason) setNote(String(j1.fallback_reason));
      setLive((v) => ({ ...v, done: ["Strategist"], active: j1.complete ? null : "Builder", note: j1.complete ? "" : "Rendering the page from the copy." }));
      await fetchSites();

      // ---- stage 2: Builder + Reviewer + Publisher ----
      if (!j1.complete) {
        if (j1.site_id) pollRoadmap(j1.site_id);
        try {
          const { res, json } = await post(
            "/api/agents/build",
            { brief, mode, stage: "render", draft_id: j1.draft_id },
            STAGE2_TIMEOUT
          );
          if (!res.ok) {
            setErr(json.error || "The builder failed — the draft is saved, press Build again to finish it.");
            await fetchSites();
            return;
          }
          setSteps([...(j1.steps ?? []), ...(json.steps ?? [])]);
          setGuards(json.guardrails ?? []);
          setEngine(json.engine ?? null);
          if (json.fallback_reason) setErr(json.fallback_reason);
          setLive({ done: AGENTS.map((a) => a.name), active: null, note: "" });
        } catch (e: any) {
          setErr(e?.name === "AbortError"
            ? "The builder timed out. The draft is saved — press Build again and it picks up from here."
            : "Lost the connection while rendering. Press Build again to finish the draft.");
          await fetchSites();
          return;
        }
      } else {
        setGuards(j1.guardrails ?? []);
        setHarness(j1.harness ?? null);
        setLive({ done: AGENTS.map((a) => a.name), active: null, note: "" });
      }

      const list = await fetchSites();
      setActive(list[0] ?? null);
    } finally {
      setBusy(false);
    }
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

  const rows = steps.length
    ? steps
    : AGENTS.map((a) => ({
        agent: a.name, role: a.role, summary: "Waiting to start",
        status: "idle" as any, notes: [] as string[], ms: 0,
      }));

  return (
    <Surface
      title="Build"
      back="/workspace"
      wide
    >
      <div className="spread" style={{ alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="s-h1">A team of coding agents builds your site</h1>
          <p className="s-lede">
            Four specialists in sequence, each run through the harness (guardrails → research → skills → instincts).
          </p>
          {model && (
            <p className={`s-status${model.configured ? " ok" : ""}`}>
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
        <div className="grid-2" style={{ marginTop: 4 }}>
          {["site.generate", "site.update", "brand.logo"].map((k) => (
            <ToolCard key={k} kind={k} onComplete={loadSites} />
          ))}
        </div>
      ) : (
        <div className="split">
          {/* LEFT: brief + agent run */}
          <div className="stack">
            <div className="s-card s-pad">
              <h3 className="s-title">The brief</h3>
              <div className="stack">
                <label className="field"><span>What the business does *</span>
                  <textarea rows={3} value={brief.idea} onChange={(e) => setBrief({ ...brief, idea: e.target.value })}
                    placeholder="a 3D site selling likes, views and followers" /></label>
                <label className="field"><span>Business name</span>
                  <input value={brief.businessName} onChange={(e) => setBrief({ ...brief, businessName: e.target.value })} placeholder="Smmpanel" /></label>
                <div className="grid-2" style={{ gap: 9 }}>
                  <label className="field"><span>Price point</span>
                    <input value={brief.price} onChange={(e) => setBrief({ ...brief, price: e.target.value })} placeholder="$1 per 100" /></label>
                  <label className="field"><span>Who it&apos;s for</span>
                    <input value={brief.audience} onChange={(e) => setBrief({ ...brief, audience: e.target.value })} placeholder="Everyone" /></label>
                </div>
                <label className="field"><span>Vibe</span>
                  <select value={brief.vibe} onChange={(e) => setBrief({ ...brief, vibe: e.target.value })}>
                    <option value="">Clean and warm (default)</option>
                    <option value="premium">Premium — dark, considered</option>
                    <option value="bold">Bold — high contrast</option>
                  </select></label>
                <div className="seg" style={{ width: "100%", justifyContent: "center" }}>
                  <button className={mode === "fast" ? "on" : ""} onClick={() => setMode("fast")}>Fast · built-in</button>
                  <button className={mode === "auto" ? "on" : ""} onClick={() => setMode("auto")}>Live · model</button>
                </div>
                <button className="btn" onClick={build} disabled={busy} style={{ width: "100%" }}>
                  {busy ? `Agents are working… ${elapsed}s` : "Build with the agent team · 3 credits"}
                </button>
                <p className="small dim" style={{ margin: 0, lineHeight: 1.55 }}>
                  {mode === "auto"
                    ? "Live: the model writes the copy first (1–4 min), then the built-in Builder, Reviewer and Publisher finish the page. If the model is unavailable it falls back and says so — it never fakes a live run."
                    : "Built-in team. About ten seconds, no model calls, same four agents and same guardrails."}
                </p>
                {note && <p className="small" style={{ margin: 0, color: /unavailable|fallback|built-in team planned/i.test(note) ? "var(--s-warn)" : "var(--s-dim)" }}>{note}</p>}
                {err && <p className="small" style={{ color: "var(--s-bad)", margin: 0 }}>{err}</p>}
              </div>
            </div>

            <div className="s-card">
              <div className="s-head">
                <span>Agent run</span>
                <span className="go">
                  {busy
                    ? `${elapsed}s · ${live.active ?? "finishing"}`
                    : engine ? (engine === "live" ? "live model" : "built-in") : steps.length ? `${steps.length} agents` : "idle"}
                </span>
              </div>
              <div className="rows">
                {rows.map((s, i) => {
                  const done = live.done.includes(s.agent) || s.status === "done" || s.status === "warning";
                  const working = busy && !done && live.active === s.agent;
                  return (
                    <div key={s.agent} className="row-item" style={{ alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row" style={{ gap: 7, flexWrap: "nowrap" }}>
                          <span style={{
                            width: 17, height: 17, borderRadius: 999, flex: "0 0 auto", display: "grid", placeItems: "center",
                            fontSize: 9, fontWeight: 700,
                            background: done ? "var(--s-good)" : working ? "var(--s-accent)" : "rgba(255,255,255,.12)",
                            color: done || working ? "#111112" : "rgba(255,255,255,.6)",
                            animation: working ? "aBlink 1.1s ease-in-out infinite" : undefined,
                          }}>
                            {done ? "✓" : working ? "…" : i + 1}
                          </span>
                          <strong style={{ fontSize: 13 }}>{s.agent}</strong>
                          <span className="dim small" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.role}</span>
                          {s.ms > 0 && <span className="dim small" style={{ marginLeft: "auto", flex: "0 0 auto" }}>{Math.round(s.ms / 100) / 10}s</span>}
                        </div>
                        <div className="small muted" style={{ marginTop: 2 }}>
                          {working ? (live.note || "Working…") : s.summary}
                        </div>
                        {s.notes?.length > 0 && (
                          <ul className="small dim" style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                            {s.notes.map((n, j) => <li key={j}>{n}</li>)}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: preview */}
          <div className="stack">
            <div className="s-card">
              <div className="s-head">
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {active ? `${active.business_name} · /s/${active.slug}` : "Preview"}
                </span>
                <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                  {active?.score != null && <span className="badge badge-idle">{Math.round(active.score)}/100</span>}
                  {active?.published
                    ? <a className="btn btn-sm btn-ghost" href={`/s/${active.slug}`} target="_blank" rel="noreferrer">Open</a>
                    : active && <button className="btn btn-sm" onClick={() => publish(active, true)}>Publish</button>}
                </div>
              </div>
              {active?.html ? (
                <iframe
                  title="Site preview"
                  srcDoc={active.html}
                  style={{ width: "100%", height: "min(520px, 62vh)", border: 0, background: "#fff", display: "block" }}
                  sandbox=""
                />
              ) : (
                <div className="s-pad" style={{ textAlign: "center", padding: "46px 20px", color: "var(--s-faint)" }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>🧱</div>
                  <h4 style={{ margin: "0 0 3px", color: "#fff" }}>The agents haven&apos;t built yet</h4>
                  <p className="small" style={{ margin: 0 }}>Fill the brief and run the team. Their output appears here.</p>
                </div>
              )}
            </div>

            {guards.length > 0 && (
              <div className="s-card">
                <div className="s-head"><span>Guardrails</span>
                  <span className="go">{guards.filter((g) => g.passed).length}/{guards.length} passed</span></div>
                <div className="rows">
                  {guards.map((g) => (
                    <div key={g.id} className="row-item" style={{ alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                          <span style={{ color: g.passed ? "var(--s-good)" : g.severity === "block" ? "var(--s-bad)" : "var(--s-warn)", fontWeight: 700 }}>
                            {g.passed ? "✓" : g.severity === "block" ? "✕" : "!"}
                          </span>
                          <strong style={{ fontSize: 12.5 }}>{g.rule}</strong>
                        </div>
                        <div className="meta">{g.detail}</div>
                      </div>
                      <span className="dim small" style={{ flex: "0 0 auto" }}>{g.id.split(".")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {harness && (
              <div className="s-card">
                <div className="s-head"><span>Harness</span><span className="go">{harness.model}</span></div>
                <div className="s-pad stack">
                  <div>
                    <div className="meta s-label">Research it worked from</div>
                    <ul className="small muted" style={{ margin: "2px 0 0", paddingLeft: 16 }}>
                      {harness.research.competitorPatterns.slice(0, 3).map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                  {harness.instincts.length > 0 && (
                    <div>
                      <div className="s-label">Instincts that fired</div>
                      <ul className="small muted" style={{ margin: "2px 0 0", paddingLeft: 16 }}>
                        {harness.instincts.map((i) => <li key={i.id}>{i.correction}</li>)}
                      </ul>
                    </div>
                  )}
                  <div>
                    <div className="s-label">Skills loaded ({harness.skills.length})</div>
                    <div className="row" style={{ gap: 4, marginTop: 3 }}>
                      {harness.skills.slice(0, 8).map((k) => <span key={k} className="badge badge-idle">{k}</span>)}
                    </div>
                  </div>
                  {harness.fallbackReason && (
                    <p className="small" style={{ margin: 0, color: "var(--s-warn)", fontWeight: 600 }}>{harness.fallbackReason}</p>
                  )}
                </div>
              </div>
            )}

            <div className="s-card">
              <div className="s-head"><span>Your sites</span><span className="go">{sites.length}</span></div>
              {sites.length === 0 ? (
                <p className="small muted s-pad" style={{ margin: 0 }}>Nothing built yet.</p>
              ) : (
                <div className="rows" style={{ maxHeight: 260, overflowY: "auto" }}>
                  {sites.map((s) => (
                    <button key={s.id} onClick={() => setActive(s)} className="row-item" style={{
                      width: "100%", border: 0, borderTop: "1px solid var(--s-line)", textAlign: "left",
                      background: active?.id === s.id ? "rgba(255,255,255,.05)" : "transparent",
                      cursor: "pointer", font: "inherit",
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: 13 }}>{s.business_name}</strong>
                        <div className="meta">/s/{s.slug} · {s.score != null ? `${Math.round(s.score)}/100` : "—"}</div>
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
    </Surface>
  );
}

function ToolCard({ kind, onComplete }: { kind: string; onComplete: () => void }) {
  const [cap, setCap] = useState<any>(null);
  useEffect(() => {
    import("@/lib/capabilities").then((m) => setCap(m.getCapability(kind)));
  }, [kind]);
  return cap ? <div className="s-card s-pad"><CapabilityRunner capability={cap} onComplete={onComplete} /></div> : null;
}
