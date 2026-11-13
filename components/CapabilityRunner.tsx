"use client";
import { useState } from "react";
import type { Capability } from "@/lib/capabilities";

type Result = { title: string; summary: string; blocks: { heading: string; body: string }[]; markdown: string };

export default function CapabilityRunner({
  capability, compact, onComplete,
}: { capability: Capability; compact?: boolean; onComplete?: () => void }) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true); setError(null); setStatus(null);
    const res = await fetch("/api/tasks/run", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: capability.kind, inputs }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error || "Run failed"); return; }
    setResult(json.artifact); setTaskId(json.task_id);
    setNeedsApproval(!!json.needsApproval);
    setStatus(json.needsApproval ? "Drafted — waiting for your approval" : "Completed");
    onComplete?.();
  }

  async function decide(decision: "approve" | "reject") {
    if (!taskId) return;
    const res = await fetch("/api/tasks/approve", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, decision }),
    });
    const json = await res.json();
    if (res.ok) {
      onComplete?.(); setNeedsApproval(false);
      setStatus(decision === "approve" ? "Approved and released" : "Rejected — nothing sent");
    } else setError(json.error);
  }

  return (
    <div className="card card-pad">
      <div className="spread" style={{ alignItems: "flex-start" }}>
        <div>
          <h3 style={{ marginBottom: 2 }}>{capability.title}</h3>
          <p className="small muted" style={{ margin: 0 }}>{capability.blurb}</p>
        </div>
        <span className="badge badge-idle">
          {capability.credits} credit{capability.credits > 1 ? "s" : ""}{capability.approval ? " · needs OK" : ""}
        </span>
      </div>

      {!compact && (
        <div className="stack" style={{ marginTop: 12, gap: 8 }}>
          {capability.inputs.map((i) => (
            <label key={i.key} className="field">
              <span>{i.label}{i.required ? " *" : ""}</span>
              <input value={inputs[i.key] ?? ""} onChange={(e) => setInputs({ ...inputs, [i.key]: e.target.value })}
                placeholder={i.placeholder ?? ""} />
            </label>
          ))}
        </div>
      )}

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn btn-sm" onClick={run} disabled={busy}>{busy ? "Working…" : "Run"}</button>
        {needsApproval && (
          <>
            <button className="btn btn-sm btn-good" onClick={() => decide("approve")}>Approve</button>
            <button className="btn btn-sm btn-bad" onClick={() => decide("reject")}>Reject</button>
          </>
        )}
        {status && <span className="small" style={{ color: needsApproval ? "var(--warn)" : "var(--good)", fontWeight: 600 }}>{status}</span>}
      </div>

      {error && <p className="small" style={{ color: "var(--bad)", margin: "8px 0 0" }}>{error}</p>}

      {result && (
        <>
          <hr className="sep" />
          <h4 style={{ marginBottom: 2 }}>{result.title}</h4>
          <p className="small muted" style={{ margin: "0 0 10px" }}>{result.summary}</p>
          <div className="prose">
            {result.blocks.map((b, i) => (
              <div key={i}>
                <h4>{b.heading}</h4>
                <p>{b.body}</p>
              </div>
            ))}
          </div>
          <button className="btn btn-sm btn-ghost" style={{ marginTop: 12 }}
            onClick={() => navigator.clipboard?.writeText(result.markdown)}>Copy as markdown</button>
        </>
      )}
    </div>
  );
}
