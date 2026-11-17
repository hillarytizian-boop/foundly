"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

type Guide = {
  fastest: string;
  eta: string;
  needs: string;
  steps: { text: string; code?: string }[];
  envKeys: string[];
  caveat?: string;
} | null;

type Props = {
  slug: string;
  name: string;
  category: string;
  mode: "oauth" | "paste" | "demo";
  canPost: "text" | "media" | null;
  connected: boolean;
  account: string | null;
  demoConnected: boolean;
  docs: string;
  callback: string;
  guide: Guide;
  caveat: { title: string; detail: string; level: "warn" | "info" } | null;
};

/**
 * The three connect routes, rendered as one page. The mode is decided on the
 * server; this component only ever shows what that mode allows, so a demo can
 * never look like a verified connection.
 */
export default function ConnectPanel(p: Props) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [pageId, setPageId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function saveReal() {
    if (!token.trim()) { setMsg({ ok: false, text: "Paste an access token first." }); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/integrations/connect-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: p.slug,
          token: token.trim(),
          pageId: pageId.trim() || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ ok: false, text: j.error || "That token was rejected." });
      else {
        setMsg({ ok: true, text: `Verified and saved — ${p.name} connected as ${j.account}.` });
        setToken("");
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "Could not reach the server. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function saveDemo() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/integrations/demo-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: p.slug }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ ok: false, text: j.error || "Could not save the demo connection." });
      else {
        setMsg({ ok: true, text: `${p.name} is connected in demo mode. Milo can see it, but nothing real was granted.` });
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "Could not reach the server. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true); setMsg(null);
    try {
      await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: p.slug }),
      });
      setMsg({ ok: true, text: `${p.name} disconnected.` });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span className="eyebrow">{p.category}</span>
        {p.connected && (
          <span className={`badge ${p.demoConnected ? "badge-warn" : "badge-done"}`}>
            {p.demoConnected ? "demo" : "connected"}
          </span>
        )}
      </div>
      <h1 style={{ fontSize: 25, margin: "0 0 6px", letterSpacing: "-.02em" }}>Connect {p.name}</h1>

      {p.connected ? (
        <div className="card card-pad-lg" style={{ marginTop: 14 }}>
          <p style={{ margin: 0, fontSize: 15 }}>
            <b>Milo can use {p.name} now.</b>
          </p>
          <p className="small muted" style={{ margin: "4px 0 0" }}>
            {p.demoConnected
              ? "Connected in demo mode — this grants no access to a real account and no post will leave Foundly."
              : p.account
              ? `Verified as ${p.account}.`
              : "Verified against the provider."}
            {p.canPost ? " Milo can publish posts here when you ask." : ""}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <Link className="btn btn-sm" href="/workspace">Back to Milo</Link>
            <button className="btn btn-sm btn-ghost" onClick={disconnect} disabled={busy}>
              {busy ? "…" : "Disconnect"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ---------------- demo ---------------- */}
          {p.mode === "demo" && (
            <div className="card card-pad-lg" style={{ marginTop: 14, borderColor: "rgba(214,158,46,.45)" }}>
              <span className="badge badge-warn">demo connection</span>
              <p style={{ margin: "10px 0 0", fontSize: 14.5 }}>
                <b>This is a demo, and it says so everywhere.</b>
              </p>
              <p className="small muted" style={{ margin: "6px 0 0" }}>
                {p.name} has no app credentials on this deployment, so Foundly cannot open their real
                consent screen — a normal OAuth link would dead-end on {p.name}&apos;s side. This records
                the connection as a demo: Milo can see it and talk about it, but no real account is
                linked and nothing can be published.
              </p>
              <p className="small muted" style={{ margin: "8px 0 0" }}>
                To make it real, add {p.slug === "google-calendar" ? "GOOGLE_CLIENT_ID" : p.slug === "notion" ? "NOTION_CLIENT_ID" : "the provider's client ID and secret"} to the
                deployment and this page switches to the real consent screen automatically.
              </p>
              <button className="btn btn-sm" onClick={saveDemo} disabled={busy} style={{ marginTop: 14 }}>
                {busy ? "…" : `Connect ${p.name} in demo mode`}
              </button>
            </div>
          )}

          {/* ---------------- real, pasted token ---------------- */}
          {p.mode === "paste" && (
            <div className="card card-pad-lg" style={{ marginTop: 14 }}>
              <p style={{ margin: 0, fontSize: 14.5 }}>
                <b>Paste an access token you already hold.</b>
              </p>
              <p className="small muted" style={{ margin: "6px 0 12px" }}>
                {p.name} has no app credentials on this deployment, so it cannot run its own consent
                screen. It can still verify a token you generate yourself: Foundly calls {p.name}&apos;s
                API with it and only saves the connection if the account comes back real.
              </p>

              {p.guide && (
                <>
                  <div className="small dim" style={{ marginBottom: 6 }}>
                    {p.guide.eta} · needs {p.guide.needs}
                  </div>
                  <ol className="small muted" style={{ margin: "0 0 12px 18px", padding: 0, lineHeight: 1.6 }}>
                    {p.guide.steps.map((s, i) => <li key={i}>{s.text}</li>)}
                  </ol>
                </>
              )}

              <label className="small dim" htmlFor="tok">Access token</label>
              <input
                id="tok"
                className="input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste the token"
                autoComplete="off"
                spellCheck={false}
                style={{ margin: "4px 0 10px" }}
              />

              {(p.slug === "facebook" || p.slug === "instagram") && (
                <>
                  <label className="small dim" htmlFor="pid">Page ID (for posting)</label>
                  <input
                    id="pid"
                    className="input"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    placeholder="Optional"
                    autoComplete="off"
                    style={{ margin: "4px 0 10px" }}
                  />
                </>
              )}

              <button className="btn btn-sm" onClick={saveReal} disabled={busy}>
                {busy ? "Verifying…" : "Verify and connect"}
              </button>
              <p className="small dim" style={{ margin: "10px 0 0" }}>
                Foundly never saves a token the provider does not confirm. Your token is stored
                server-side and never sent to the browser again.
              </p>
            </div>
          )}

          {/* ---------------- real OAuth ---------------- */}
          {p.mode === "oauth" && (
            <div className="card card-pad-lg" style={{ marginTop: 14 }}>
              <p style={{ margin: 0, fontSize: 14.5 }}>
                <b>{p.name} is ready on this deployment.</b>
              </p>
              <p className="small muted" style={{ margin: "6px 0 12px" }}>
                You&apos;ll see {p.name}&apos;s own consent screen. Foundly receives a token only after you approve it.
              </p>

              {p.caveat && (
                <div className="ap-caveat warn" style={{ marginBottom: 12 }}>
                  <b>{p.caveat.title}</b>
                  <span>{p.caveat.detail}</span>
                </div>
              )}
              <a className="btn btn-sm" href={`/api/integrations/start?slug=${p.slug}`}>
                Continue to {p.name}
              </a>
              <p className="small dim" style={{ margin: "10px 0 0" }}>
                Callback: <code>{p.callback}</code>
              </p>
            </div>
          )}
        </>
      )}

      {msg && (
        <p className="small" style={{ marginTop: 12, color: msg.ok ? "var(--ok, #17a673)" : "var(--bad, #e5484d)" }}>
          {msg.text}
        </p>
      )}

      <p className="small dim" style={{ marginTop: 18 }}>
        Official app setup:{" "}
        <a href={p.docs} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>{p.docs}</a>
      </p>
      <p className="small dim" style={{ marginTop: 8 }}>
        <Link href="/workspace/integrations" style={{ textDecoration: "underline" }}>All connections</Link>
        {" · "}
        <Link href="/workspace" style={{ textDecoration: "underline" }}>Back to Milo</Link>
      </p>
    </>
  );
}
