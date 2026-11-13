"use client";
import { useEffect, useState } from "react";
import type { Capability } from "@/lib/capabilities";
import { createClient } from "@/lib/supabase/client";

type Result = {
  title: string;
  summary: string;
  blocks: { heading: string; body: string }[];
  markdown: string;
};

export default function CapabilityRunner({ capability, compact, onComplete }: { capability: Capability; compact?: boolean; onComplete?: () => void }) {
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: capability.kind, inputs }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error || "Run failed"); return; }
    setResult(json.artifact);
    setTaskId(json.task_id);
    setNeedsApproval(!!json.needsApproval);
    setStatus(json.needsApproval ? "Drafted — waiting for your approval" : "Completed");
    onComplete?.();
  }

  async function decide(decision: "approve" | "reject") {
    if (!taskId) return;
    const res = await fetch("/api/tasks/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, decision }),
    });
    const json = await res.json();
    if (res.ok) {
      onComplete?.();
      setNeedsApproval(false);
      setStatus(decision === "approve" ? "Approved and released" : "Rejected — nothing sent");
    } else setError(json.error);
  }

  useEffect(() => {
    const supabase = createClient();
    if (taskId) supabase.from("profiles").select("credits").single().then(() => {});
  }, [taskId]);

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 18, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <h3 style={{ margin: 0 }}>{capability.title}</h3>
        <span style={{ fontSize: 12, color: "#666", whiteSpace: "nowrap" }}>
          {capability.credits} credit{capability.credits > 1 ? "s" : ""}{capability.approval ? " · needs approval" : ""}
        </span>
      </div>
      <p style={{ color: "#555", marginTop: 6, fontSize: 14 }}>{capability.blurb}</p>

      {!compact && (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {capability.inputs.map((i) => (
            <input key={i.key} placeholder={`${i.label}${i.required ? " *" : ""}${i.placeholder ? ` — ${i.placeholder}` : ""}`}
              value={inputs[i.key] ?? ""}
              onChange={(e) => setInputs({ ...inputs, [i.key]: e.target.value })}
              style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }} />
          ))}
        </div>
      )}

      <button onClick={run} disabled={busy} style={{
        marginTop: 10, background: "#111", color: "#fff", border: 0, padding: "10px 16px",
        borderRadius: 8, fontWeight: 700, cursor: "pointer", opacity: busy ? 0.6 : 1,
      }}>{busy ? "Milo is working…" : "Run"}</button>

      {error && <p style={{ color: "#b00", fontSize: 14 }}>{error}</p>}
      {status && <p style={{ color: "#0a6", fontSize: 14, fontWeight: 600 }}>{status}</p>}

      {needsApproval && (
        <div style={{ display: "flex", gap: 8, margin: "8px 0 12px" }}>
          <button onClick={() => decide("approve")} style={{ background: "#0a6", color: "#fff", border: 0, padding: "8px 14px", borderRadius: 8, fontWeight: 700 }}>Approve</button>
          <button onClick={() => decide("reject")} style={{ background: "#fff", color: "#b00", border: "1px solid #f0c0c0", padding: "8px 14px", borderRadius: 8, fontWeight: 700 }}>Reject</button>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 14, borderTop: "1px solid #eee", paddingTop: 14 }}>
          <h4 style={{ margin: "0 0 4px" }}>{result.title}</h4>
          <p style={{ color: "#555", marginTop: 0 }}>{result.summary}</p>
          {result.blocks.map((b, i) => (
            <div key={i} style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 14 }}>{b.heading}</strong>
              <p style={{ whiteSpace: "pre-wrap", margin: "4px 0 0", fontSize: 14, lineHeight: 1.6 }}>{b.body}</p>
            </div>
          ))}
          <button
            onClick={() => navigator.clipboard?.writeText(result.markdown)}
            style={{ marginTop: 14, background: "#f4f4f4", border: "1px solid #eee", padding: "8px 14px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
          >Copy as markdown</button>
        </div>
      )}
    </div>
  );
}
