"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type P = {
  slug: string; name: string; category: string; canPost: string | null;
  configured: boolean; connected: boolean; viaOAuth: boolean;
  account: string | null; docs: string;
};

export default function Page() {
  return <Suspense fallback={<div className="page"><p className="muted">Loading…</p></div>}><Integrations /></Suspense>;
}

function Integrations() {
  const params = useSearchParams();
  const [providers, setProviders] = useState<P[]>([]);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const justConnected = params.get("connected");
  const errorParam = params.get("error");

  async function load() {
    const res = await fetch("/api/integrations/status");
    if (res.ok) {
      const j = await res.json();
      setProviders(j.providers ?? []);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (justConnected) setBanner({ kind: "ok", msg: `${justConnected} connected. Milo can use it now.` });
    if (errorParam) setBanner({ kind: "err", msg: errorParam });
  }, [justConnected, errorParam]);

  async function disconnect(slug: string) {
    setBusy(slug);
    await fetch("/api/integrations/disconnect", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }),
    });
    await load(); setBusy(null);
  }

  const categories = useMemo(() => [...new Set(providers.map((p) => p.category))], [providers]);
  const visible = providers.filter((p) =>
    !filter || filter === "__all" || p.category === filter || p.name.toLowerCase().includes(filter.toLowerCase()));
  const connectedCount = providers.filter((p) => p.connected).length;
  const configuredCount = providers.filter((p) => p.configured).length;

  return (
    <div className="page">
      <div className="spread">
        <div>
          <span className="eyebrow">Integrations</span>
          <h1 style={{ margin: "2px 0 0", fontSize: 22 }}>Connect Milo to your tools</h1>
          <p className="small muted" style={{ margin: "3px 0 0" }}>
            {connectedCount} connected · {configuredCount} of {providers.length} providers ready on this deployment.
          </p>
        </div>
        <input placeholder="Search apps…" value={filter.startsWith("__") ? "" : filter}
          onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 220 }} />
      </div>

      {banner && (
        <div className="card card-pad" style={{
          marginTop: 12, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center",
          borderColor: banner.kind === "ok" ? "rgba(23,166,115,.35)" : "rgba(210,67,67,.35)",
          background: banner.kind === "ok" ? "rgba(23,166,115,.08)" : "rgba(210,67,67,.07)",
        }}>
          <span className="small" style={{ fontWeight: 600, color: banner.kind === "ok" ? "#0d7a54" : "#a92f2f" }}>{banner.msg}</span>
          <button className="btn btn-sm btn-ghost" onClick={() => setBanner(null)}>Dismiss</button>
        </div>
      )}

      <div className="seg" style={{ marginTop: 12 }}>
        <button className={!filter ? "on" : ""} onClick={() => setFilter("")}>All</button>
        {categories.map((c) => (
          <button key={c} className={filter === c ? "on" : ""} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>

      {loading ? <p className="small muted" style={{ marginTop: 14 }}>Loading providers…</p> : (
        <div className="grid-3" style={{ marginTop: 12 }}>
          {visible.map((p) => (
            <div key={p.slug} className="card card-pad" style={p.connected ? { borderColor: "rgba(23,166,115,0.4)" } : undefined}>
              <div className="spread" style={{ alignItems: "flex-start" }}>
                <strong style={{ fontSize: 13.5 }}>{p.name}</strong>
                <span className="badge badge-idle">{p.category}</span>
              </div>

              <div className="row" style={{ gap: 5, marginTop: 6 }}>
                {p.canPost && <span className="badge badge-run">can post</span>}
                {p.connected && p.viaOAuth && <span className="badge badge-done">live token</span>}
                {!p.configured && <span className="badge badge-bad">needs credentials</span>}
              </div>

              {p.account && <p className="small muted" style={{ margin: "6px 0 0" }}>as {p.account}</p>}

              {p.connected ? (
                <button className="btn btn-sm btn-ghost" disabled={busy === p.slug} onClick={() => disconnect(p.slug)}
                  style={{ width: "100%", marginTop: 10, color: "#a92f2f", borderColor: "rgba(210,67,67,.3)" }}>
                  {busy === p.slug ? "…" : "Disconnect"}
                </button>
              ) : p.configured ? (
                <a className="btn btn-sm" href={`/api/integrations/start?slug=${p.slug}`}
                  style={{ width: "100%", marginTop: 10, display: "flex" }}>Connect</a>
              ) : (
                <div style={{ marginTop: 10 }}>
                  <button className="btn btn-sm btn-ghost" disabled style={{ width: "100%", opacity: 0.6 }}>
                    Add credentials to enable
                  </button>
                  <a href={p.docs} target="_blank" rel="noreferrer" className="small dim"
                    style={{ display: "block", marginTop: 5, textAlign: "center" }}>Get API keys ↗</a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card card-pad" style={{ marginTop: 14 }}>
        <h4 style={{ marginBottom: 4 }}>Why most buttons say &ldquo;add credentials&rdquo;</h4>
        <p className="small muted" style={{ margin: 0 }}>
          Each provider needs its own OAuth app credentials on this deployment. Once you paste a provider&apos;s client ID
          and secret into the environment (for example <code>X_CLIENT_ID</code> / <code>X_CLIENT_SECRET</code>), its
          Connect button goes live and posts publish for real. Tokens are stored server-side only and are never sent to
          the browser.
        </p>
      </div>
    </div>
  );
}
