"use client";
import { useEffect, useState } from "react";
import WorkspaceShell from "@/components/WorkspaceShell";
import CapabilityRunner from "@/components/CapabilityRunner";
import { CAPABILITIES } from "@/lib/capabilities";
import { createClient } from "@/lib/supabase/client";

type Site = { id: string; business_name: string; idea: string; content: any; created_at: string };

export default function BuildEnvironment() {
  const caps = CAPABILITIES.filter((c) => c.env === "build");
  const [sites, setSites] = useState<Site[]>([]);
  const [open, setOpen] = useState<string>(caps[0].kind);

  async function loadSites() {
    const supabase = createClient();
    const { data } = await supabase.from("sites").select("*").order("created_at", { ascending: false }).limit(10);
    setSites((data as Site[]) ?? []);
  }
  useEffect(() => { loadSites(); }, []);

  return (
    <WorkspaceShell>
      <p style={{ color: "#666", textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 700, margin: 0 }}>Build · create the assets</p>
      <h1 style={{ margin: "6px 0 4px" }}>Make the business real</h1>
      <p style={{ color: "#555", marginTop: 0 }}>Website, branding, catalogue — Milo builds each one and you approve what ships.</p>

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
        {caps.filter((c) => c.kind === open).map((c) => <CapabilityRunner key={c.kind} capability={c} onComplete={loadSites} />)}
      </div>

      <h2 style={{ marginTop: 32, fontSize: 18 }}>Your websites</h2>
      {sites.length === 0 ? <p style={{ color: "#888" }}>No sites yet — build one above.</p> : (
        <div style={{ display: "grid", gap: 10 }}>
          {sites.map((s) => (
            <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, background: "#fff" }}>
              <strong>{s.business_name}</strong>
              <span style={{ color: "#888", fontSize: 13 }}> · {new Date(s.created_at).toLocaleDateString()}</span>
              <p style={{ margin: "6px 0 0", color: "#555", fontSize: 14 }}>{s.content?.hero}</p>
              <p style={{ margin: "4px 0 0", color: "#666", fontSize: 13 }}>{s.idea.slice(0, 140)}</p>
            </div>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}
