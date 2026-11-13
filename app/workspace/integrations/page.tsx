"use client";
import { useEffect, useMemo, useState } from "react";
import WorkspaceShell from "@/components/WorkspaceShell";
import { INTEGRATIONS } from "@/lib/capabilities";
import { createClient } from "@/lib/supabase/client";

export default function IntegrationsPage() {
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("integrations").select("slug,status");
    const map: Record<string, boolean> = {};
    (data ?? []).forEach((r: any) => { map[r.slug] = r.status === "connected"; });
    setConnected(map);
  }
  useEffect(() => { load(); }, []);

  async function toggle(slug: string, name: string, category: string) {
    setBusy(slug);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const isOn = connected[slug];
      if (isOn) {
        await supabase.from("integrations").delete().eq("user_id", user.id).eq("slug", slug);
      } else {
        await supabase.from("integrations").upsert({
          user_id: user.id, slug, name, category, status: "connected", connected_at: new Date().toISOString(),
        }, { onConflict: "user_id,slug" });
      }
      await load();
    }
    setBusy(null);
  }

  const categories = useMemo(() => [...new Set(INTEGRATIONS.map((i) => i.category))], []);
  const visible = INTEGRATIONS.filter((i) =>
    !filter || i.name.toLowerCase().includes(filter.toLowerCase()) || i.category.toLowerCase().includes(filter.toLowerCase())
  );
  const count = Object.values(connected).filter(Boolean).length;

  return (
    <WorkspaceShell>
      <p style={{ color: "#666", textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 700, margin: 0 }}>Integrations</p>
      <h1 style={{ margin: "6px 0 4px" }}>Connect Milo to your tools</h1>
      <p style={{ color: "#555", marginTop: 0 }}>
        {count} of {INTEGRATIONS.length} connected. Milo can only act on tools you've connected and approved.
      </p>

      <input placeholder="Search integrations…" value={filter} onChange={(e) => setFilter(e.target.value)}
        style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd", width: "100%", maxWidth: 320, marginTop: 8 }} />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "12px 0" }}>
        <button onClick={() => setFilter("")} style={{ border: "1px solid #ddd", background: !filter ? "#111" : "#fff", color: !filter ? "#fff" : "#111", padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>All</button>
        {categories.map((c) => (
          <button key={c} onClick={() => setFilter(c)} style={{ border: "1px solid #ddd", background: filter === c ? "#111" : "#fff", color: filter === c ? "#fff" : "#111", padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{c}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
        {visible.map((i) => {
          const on = connected[i.slug];
          return (
            <div key={i.slug} style={{ border: on ? "1px solid #0a6" : "1px solid #eee", borderRadius: 12, padding: 16, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: 14 }}>{i.name}</strong>
                <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{i.category}</span>
              </div>
              <button onClick={() => toggle(i.slug, i.name, i.category)} disabled={busy === i.slug}
                style={{ marginTop: 10, width: "100%", background: on ? "#e7f6ee" : "#111", color: on ? "#0a6" : "#fff", border: 0, padding: "8px 12px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {busy === i.slug ? "…" : on ? "Connected — disconnect" : "Connect"}
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: 24, fontSize: 13, color: "#777" }}>
        Foundly records the connection intent here. Real OAuth for each provider is enabled per-integration as
        API credentials are added — Milo never claims an action succeeded until the provider confirms it.
      </p>
    </WorkspaceShell>
  );
}
