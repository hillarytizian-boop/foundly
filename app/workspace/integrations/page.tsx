"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Guide = {
  slug: string; fastest: string; eta: string; needs: string; caveat?: string;
  steps: { text: string }[]; envKeys: string[]; callback: string;
};

type P = {
  slug: string; name: string; category: string; canPost: string | null;
  configured: boolean; connected: boolean; viaOAuth: boolean;
  account: string | null; docs: string; guide: Guide | null;
  tokenConnect: boolean; envKeys: string[];
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
  const [open, setOpen] = useState<string | null>(null);

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
  const socials = providers.filter((p) => p.category === "Social" || p.category === "Video");

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

      {/* ── social channels, the short path ─────────────────── */}
      {!loading && socials.length > 0 && (
        <section style={{ marginTop: 16 }}>
          <div className="spread">
            <h3 style={{ margin: 0, fontSize: 14 }}>Social channels</h3>
            <span className="small dim">{socials.filter((p) => p.connected).length} of {socials.length} connected</span>
          </div>
          <p className="small muted" style={{ margin: "4px 0 0", maxWidth: 620 }}>
            Every connection below is verified against the platform&apos;s own API before it is saved. If a token is
            rejected, you get the platform&apos;s error and nothing is stored.
          </p>

          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {socials.map((p) => (
              <SocialRow
                key={p.slug}
                p={p}
                busy={busy === p.slug}
                expanded={open === p.slug}
                onToggle={() => setOpen(open === p.slug ? null : p.slug)}
                onDisconnect={() => disconnect(p.slug)}
                onDone={(msg) => { setBanner({ kind: "ok", msg }); setOpen(null); load(); }}
                onError={(msg) => setBanner({ kind: "err", msg })}
              />
            ))}
          </div>
        </section>
      )}

      <div className="seg" style={{ marginTop: 18 }}>
        <button className={!filter ? "on" : ""} onClick={() => setFilter("")}>All</button>
        {categories.map((c) => (
          <button key={c} className={filter === c ? "on" : ""} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>

      {loading ? <p className="small muted" style={{ marginTop: 14 }}>Loading providers…</p> : (
        <div className="grid-3" style={{ marginTop: 12 }}>
          {visible.filter((p) => p.category !== "Social" && p.category !== "Video").map((p) => (
            <div key={p.slug} className="card card-pad" style={p.connected ? { borderColor: "rgba(23,166,115,0.4)" } : undefined}>
              <div className="spread" style={{ alignItems: "flex-start" }}>
                <strong style={{ fontSize: 13.5 }}>{p.name}</strong>
                <span className="badge badge-idle">{p.category}</span>
              </div>
              <div className="row" style={{ gap: 5, marginTop: 6 }}>
                {p.connected && <span className="badge badge-done">connected</span>}
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
        <h4 style={{ marginBottom: 4 }}>How a connection becomes real</h4>
        <p className="small muted" style={{ margin: 0 }}>
          Two routes, both verified. <strong>OAuth</strong>: add a platform&apos;s client ID and secret to this deployment
          (as environment variables), and its Connect button opens the platform&apos;s own consent screen.{" "}
          <strong>Paste a token</strong>: if you already generated an access token, Foundly calls the platform&apos;s
          profile endpoint with it and saves the connection only if the platform confirms the account. Tokens are stored
          server-side only and are never sent to the browser.
        </p>
      </div>
    </div>
  );
}

function SocialRow({
  p, busy, expanded, onToggle, onDisconnect, onDone, onError,
}: {
  p: P; busy: boolean; expanded: boolean;
  onToggle: () => void; onDisconnect: () => void;
  onDone: (msg: string) => void; onError: (msg: string) => void;
}) {
  const [token, setToken] = useState("");
  const [pageId, setPageId] = useState("");
  const [igUserId, setIgUserId] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function verify(save: boolean) {
    if (!token.trim()) { onError("Paste an access token first."); return; }
    setChecking(true); setResult(null);
    try {
      const res = await fetch("/api/integrations/connect-token", {
        method: save ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: p.slug, token: token.trim(), pageId: pageId.trim() || undefined, igUserId: igUserId.trim() || undefined }),
      });
      const j = await res.json();
      if (!res.ok) {
        setResult({ ok: false, msg: j.error || "That token was rejected." });
      } else if (save) {
        setToken(""); setResult(null);
        onDone(`${p.name} connected as ${j.account}. Posts will publish for real.`);
      } else {
        setResult({ ok: true, msg: `Verified: ${j.account}. Nothing saved yet — press Connect to keep it.` });
      }
    } catch (e: any) {
      setResult({ ok: false, msg: e?.message || "Request failed" });
    }
    setChecking(false);
  }

  const guide = p.guide;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", borderColor: p.connected ? "rgba(23,166,115,0.4)" : undefined }}>
      <div className="spread" style={{ padding: "11px 13px", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <strong style={{ fontSize: 13.5 }}>{p.name}</strong>
          {p.connected
            ? <span className="badge badge-done">connected</span>
            : p.configured
              ? <span className="badge badge-run">ready</span>
              : <span className="badge badge-idle">needs setup</span>}
          {p.canPost === "media" && <span className="badge badge-idle">image/video only</span>}
          {p.account && <span className="small dim" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>as {p.account}</span>}
        </div>

        <div style={{ display: "flex", gap: 6, flex: "0 0 auto" }}>
          {p.configured && !p.connected && (
            <a className="btn btn-sm" href={`/api/integrations/start?slug=${p.slug}`}>Connect with OAuth</a>
          )}
          {p.connected ? (
            <button className="btn btn-sm btn-ghost" disabled={busy} onClick={onDisconnect}
              style={{ color: "#a92f2f", borderColor: "rgba(210,67,67,.3)" }}>
              {busy ? "…" : "Disconnect"}
            </button>
          ) : (
            <button className="btn btn-sm btn-ghost" onClick={onToggle}>
              {expanded ? "Hide setup" : p.tokenConnect ? "Setup / paste token" : "Setup"}
            </button>
          )}
        </div>
      </div>

      {expanded && !p.connected && (
        <div style={{ borderTop: "1px solid var(--line, #e8ecf2)", padding: "12px 13px", background: "rgba(248,250,252,.6)" }}>
          {guide ? (
            <>
              <p className="small" style={{ margin: 0, fontWeight: 600 }}>
                {guide.needs} <span className="dim" style={{ fontWeight: 500 }}>· {guide.eta}</span>
              </p>
              <ol className="small muted" style={{ margin: "7px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
                {guide.steps.map((s, i) => <li key={i}>{s.text}</li>)}
              </ol>
              {guide.caveat && (
                <p className="small dim" style={{ margin: "7px 0 0", lineHeight: 1.55 }}>{guide.caveat}</p>
              )}
              <div style={{ marginTop: 9, display: "grid", gap: 4 }}>
                <span className="small dim">Redirect URI for the OAuth route:</span>
                <code style={{ fontSize: 11.5, background: "#fff", border: "1px solid #e8ecf2", borderRadius: 6, padding: "5px 7px", wordBreak: "break-all" }}>
                  {`https://foundly-three.vercel.app${guide.callback}`}
                </code>
                <span className="small dim" style={{ marginTop: 3 }}>Deployment environment variables:</span>
                <code style={{ fontSize: 11.5, background: "#fff", border: "1px solid #e8ecf2", borderRadius: 6, padding: "5px 7px", wordBreak: "break-all" }}>
                  {guide.envKeys.join("  ·  ")}
                </code>
              </div>
            </>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>
              This provider uses OAuth only. Add its client credentials to the deployment to enable Connect.
            </p>
          )}

          {p.tokenConnect && (
            <div style={{ marginTop: 11, borderTop: "1px dashed #dfe6ef", paddingTop: 10 }}>
              <label className="small" style={{ fontWeight: 600 }}>Already have an access token? Paste it here.</label>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={p.slug === "x" ? "X access token" : `${p.name} access token`}
                  style={{ flex: "1 1 260px", minWidth: 0 }}
                  autoComplete="off"
                />
                {(p.slug === "facebook" || p.slug === "instagram") && (
                  <input
                    value={p.slug === "facebook" ? pageId : igUserId}
                    onChange={(e) => (p.slug === "facebook" ? setPageId : setIgUserId)(e.target.value)}
                    placeholder={p.slug === "facebook" ? "Page ID" : "IG Business account ID"}
                    style={{ flex: "1 1 150px", minWidth: 0 }}
                  />
                )}
                <button className="btn btn-sm btn-ghost" disabled={checking} onClick={() => verify(false)}>
                  {checking ? "Checking…" : "Test"}
                </button>
                <button className="btn btn-sm" disabled={checking} onClick={() => verify(true)}>Connect</button>
              </div>
              {result && (
                <p className="small" style={{ margin: "7px 0 0", fontWeight: 600, color: result.ok ? "#0d7a54" : "#a92f2f" }}>
                  {result.msg}
                </p>
              )}
              <p className="small dim" style={{ margin: "6px 0 0" }}>
                Test calls the platform&apos;s profile endpoint and saves nothing. Connect saves it only after that check passes.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
