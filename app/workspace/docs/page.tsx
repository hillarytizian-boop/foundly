"use client";
import { useEffect, useState } from "react";
import WorkspaceShell from "@/components/WorkspaceShell";
import { createClient } from "@/lib/supabase/client";

type Task = { id: string; title: string; kind: string; status: string; created_at: string; result: any };

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Task[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("tasks").select("id,title,kind,status,created_at,result")
      .in("status", ["done", "needs_approval"])
      .order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setDocs((data as Task[]) ?? []));
  }, []);

  const open = docs.find((d) => d.id === openId);

  return (
    <WorkspaceShell>
      <p style={{ color: "#666", textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 700, margin: 0 }}>Documents</p>
      <h1 style={{ margin: "6px 0 4px" }}>Everything Milo has produced</h1>
      <p style={{ color: "#555", marginTop: 0 }}>Plans, briefs, decks, outreach and posts — all stored, all exportable.</p>

      {docs.length === 0 ? <p style={{ color: "#888" }}>Nothing yet. Run something in Home, Build or Run.</p> : (
        <div style={{ border: "1px solid #eee", borderRadius: 12, background: "#fff", overflow: "hidden", marginTop: 16 }}>
          {docs.map((d, i) => (
            <button key={d.id} onClick={() => setOpenId(d.id)} style={{
              display: "flex", justifyContent: "space-between", gap: 12, width: "100%", textAlign: "left",
              padding: "12px 16px", border: 0, borderTop: i ? "1px solid #f2f2f2" : "none",
              background: openId === d.id ? "#fafafa" : "#fff", cursor: "pointer", font: "inherit",
            }}>
              <span><strong style={{ fontSize: 14 }}>{d.result?.title || d.title}</strong>
                <span style={{ display: "block", fontSize: 12, color: "#888" }}>{d.kind} · {new Date(d.created_at).toLocaleDateString()}</span></span>
              <span style={{ fontSize: 12, color: d.status === "done" ? "#0a6" : "#b26a00", fontWeight: 700 }}>
                {d.status === "done" ? "Ready" : "Draft"}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div style={{ marginTop: 20, border: "1px solid #eee", borderRadius: 12, padding: 20, background: "#fff" }}>
          <h2 style={{ marginTop: 0 }}>{open.result?.title}</h2>
          <p style={{ color: "#555", marginTop: 0 }}>{open.result?.summary}</p>
          {(open.result?.blocks ?? []).map((b: any, i: number) => (
            <div key={i} style={{ marginTop: 14 }}>
              <strong style={{ fontSize: 14 }}>{b.heading}</strong>
              <p style={{ whiteSpace: "pre-wrap", margin: "4px 0 0", fontSize: 14, lineHeight: 1.65 }}>{b.body}</p>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <button onClick={() => navigator.clipboard?.writeText(open.result?.markdown || "")}
              style={{ background: "#111", color: "#fff", border: 0, padding: "10px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
              Copy markdown
            </button>
            <button onClick={() => {
              const blob = new Blob([open.result?.markdown || ""], { type: "text/markdown" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `${(open.result?.title || "foundly-doc").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
              a.click();
            }} style={{ background: "#fff", border: "1px solid #ddd", padding: "10px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
              Download .md
            </button>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}
