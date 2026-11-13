"use client";
import { useEffect, useState } from "react";
import { CAPABILITIES } from "@/lib/capabilities";
import { createClient } from "@/lib/supabase/client";
import CapabilityRunner from "@/components/CapabilityRunner";

type Site = { id: string; business_name: string; idea: string; content: any; created_at: string };

export default function BuildPage() {
  const caps = CAPABILITIES.filter((c) => c.env === "build");
  const [open, setOpen] = useState(caps[0].kind);
  const [sites, setSites] = useState<Site[]>([]);

  async function loadSites() {
    const supabase = createClient();
    const { data } = await supabase.from("sites").select("*").order("created_at", { ascending: false }).limit(10);
    setSites((data as Site[]) ?? []);
  }
  useEffect(() => { loadSites(); }, []);

  const active = caps.find((c) => c.kind === open)!;
  const preview = sites[0];

  return (
    <div className="page">
      <div className="spread">
        <div>
          <span className="eyebrow">Build</span>
          <h1 style={{ margin: "2px 0 0", fontSize: 22 }}>Make the business real</h1>
          <p className="small muted" style={{ margin: "3px 0 0" }}>Website, branding, catalogue. Milo builds each one; you approve what ships.</p>
        </div>
        <div className="seg">
          {caps.map((c) => (
            <button key={c.kind} className={open === c.kind ? "on" : ""} onClick={() => setOpen(c.kind)}>{c.title}</button>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 12, gridTemplateColumns: "minmax(300px, 0.85fr) minmax(320px, 1.15fr)" }}>
        <CapabilityRunner capability={active} onComplete={loadSites} />

        <div className="card" style={{ overflow: "hidden" }}>
          <div className="card-head">
            <span>{preview ? `${preview.business_name} · preview` : "Your first build"}</span>
            <span className="go">{sites.length} site{sites.length === 1 ? "" : "s"}</span>
          </div>
          {preview ? (
            <div>
              <div style={{ padding: 18, background: "linear-gradient(160deg,#0d1420,#1b2735)", color: "#fff" }}>
                <div className="eyebrow" style={{ color: "rgba(255,255,255,0.6)" }}>{preview.idea.slice(0, 60)}</div>
                <h2 style={{ margin: "6px 0 4px", fontSize: 20 }}>{preview.content?.hero ?? preview.business_name}</h2>
                <p className="small" style={{ color: "rgba(255,255,255,0.72)", margin: 0 }}>{preview.content?.sub}</p>
                <div className="row" style={{ marginTop: 12 }}>
                  <span className="chip" style={{ background: "#fff", borderColor: "#fff", color: "#111" }}>{preview.content?.cta ?? "Get started"}</span>
                </div>
              </div>
              <div className="card-pad">
                {(preview.content?.sections ?? []).slice(0, 4).map((s: any, i: number) => (
                  <div key={i} style={{ marginTop: i ? 12 : 0 }}>
                    <h4 style={{ marginBottom: 2 }}>{s.heading}</h4>
                    <p className="small muted" style={{ margin: 0 }}>{s.body}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card-pad" style={{ textAlign: "center", padding: "40px 20px", color: "var(--ink-3)" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>🖼️</div>
              <h4 style={{ margin: "0 0 3px" }}>Your first build will appear here</h4>
              <p className="small" style={{ margin: 0 }}>Tell Milo about the business. What he builds shows up here.</p>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-head"><span>Your websites</span><span className="go">{sites.length}</span></div>
        {sites.length === 0 ? (
          <p className="small muted card-pad" style={{ margin: 0 }}>No sites yet — build one above.</p>
        ) : (
          <div className="rows">
            {sites.map((s) => (
              <div key={s.id} className="row-item">
                <div>
                  <strong style={{ fontSize: 13 }}>{s.business_name}</strong>
                  <div className="meta">{s.idea.slice(0, 90)}</div>
                </div>
                <span className="badge badge-done">live</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
