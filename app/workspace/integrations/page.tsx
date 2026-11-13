"use client";
import { useEffect, useMemo, useState } from "react";
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
      if (connected[slug]) await supabase.from("integrations").delete().eq("user_id", user.id).eq("slug", slug);
      else await supabase.from("integrations").upsert({
        user_id: user.id, slug, name, category, status: "connected", connected_at: new Date().toISOString(),
      }, { onConflict: "user_id,slug" });
      await load();
    }
    setBusy(null);
  }

  const categories = useMemo(() => [...new Set(INTEGRATIONS.map((i) => i.category))], []);
  const visible = INTEGRATIONS.filter((i) => !filter || filter === "__all" ||
    i.name.toLowerCase().includes(filter.toLowerCase()) || i.category === filter);
  const count = Object.values(connected).filter(Boolean).length;

  return (
    <div className="page">
      <div className="spread">
        <div>
          <span className="eyebrow">Integrations</span>
          <h1 style={{ margin: "2px 0 0", fontSize: 22 }}>Connect Milo to your tools</h1>
          <p className="small muted" style={{ margin: "3px 0 0" }}>
            {count} of {INTEGRATIONS.length} connected. Milo only acts on tools you&apos;ve connected and approved.
          </p>
        </div>
        <input placeholder="Search…" value={filter.startsWith("__") ? "" : filter}
          onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 220 }} />
      </div>

      <div className="seg" style={{ marginTop: 12 }}>
        <button className={!filter ? "on" : ""} onClick={() => setFilter("")}>All</button>
        {categories.map((c) => (
          <button key={c} className={filter === c ? "on" : ""} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>

      <div className="grid-3" style={{ marginTop: 12 }}>
        {visible.map((i) => {
          const on = connected[i.slug];
          return (
            <div key={i.slug} className="card card-pad" style={on ? { borderColor: "rgba(23,166,115,0.4)" } : undefined}>
              <div className="spread" style={{ alignItems: "flex-start" }}>
                <strong style={{ fontSize: 13.5 }}>{i.name}</strong>
                <span className="badge badge-idle">{i.category}</span>
              </div>
              <button className="btn btn-sm" onClick={() => toggle(i.slug, i.name, i.category)} disabled={busy === i.slug}
                style={{ width: "100%", marginTop: 10, ...(on ? { background: "rgba(23,166,115,0.12)", color: "#0d7a54", borderColor: "rgba(23,166,115,0.3)" } : {}) }}>
                {busy === i.slug ? "…" : on ? "Connected · disconnect" : "Connect"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="small dim" style={{ marginTop: 16 }}>
        Foundly records your connection intent here. Live OAuth is enabled per provider as API credentials are added —
        Milo never reports an action as sent until the provider confirms it.
      </p>
    </div>
  );
}
