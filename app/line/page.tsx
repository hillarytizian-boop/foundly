"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };
type Site = { id: string; business_name: string; idea: string; content: any; created_at: string };

export default function Line() {
  const supabase = createClient();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi, I'm Milo — your AI employee. Tell me your idea in one sentence and I'll turn it into a business: site, outreach, social, and payments." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [idea, setIdea] = useState("");
  const [bizName, setBizName] = useState("");
  const [sitePreview, setSitePreview] = useState<any>(null);
  const [tab, setTab] = useState<"chat" | "sites" | "outreach" | "social" | "payments">("chat");
  const [audience, setAudience] = useState("");
  const [outreach, setOutreach] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [social, setSocial] = useState("");

  useEffect(() => {
    loadSites();
  }, []);

  async function loadSites() {
    const { data } = await supabase.from("sites").select("*").order("created_at", { ascending: false }).limit(10);
    if (data) setSites(data as Site[]);
  }

  async function send() {
    if (!input.trim() || busy) return;
    const userMsg: Msg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/milo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const json = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: json.reply || "On it." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network hiccup — try again in a moment." }]);
    } finally {
      setBusy(false);
    }
  }

  async function generateSite() {
    if (!idea.trim()) return;
    setBusy(true);
    const res = await fetch("/api/sites/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea, businessName: bizName }),
    });
    const json = await res.json();
    setSitePreview(json.site);
    setBusy(false);
    await loadSites();
  }

  async function checkout() {
    const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const json = await res.json();
    if (json.url) window.location.href = json.url;
    else alert(json.error || "Checkout not configured yet — add Stripe keys in .env.local");
  }

  async function draftOutreach() {
    if (!idea.trim() && !input.trim()) return;
    setBusy(true);
    const res = await fetch("/api/outreach/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: idea || input, audience }),
    });
    const json = await res.json();
    setOutreach(json.draft || json.error || "");
    setBusy(false);
  }

  async function draftSocial() {
    if (!idea.trim() && !input.trim()) return;
    setBusy(true);
    const res = await fetch("/api/social/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: idea || input, platform }),
    });
    const json = await res.json();
    setSocial(json.draft || json.error || "");
    setBusy(false);
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>
      <h1 style={{ marginBottom: 4 }}>Your line</h1>
      <p style={{ color: "#555", marginTop: 0 }}>Milo works here. You see everything he does.</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
        {(["chat", "sites", "outreach", "social", "payments"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid #ddd", background: tab === t ? "#111" : "#fff", color: tab === t ? "#fff" : "#111", fontWeight: 600, textTransform: "capitalize" }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "chat" && (
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "grid", gap: 12, minHeight: 300 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%", background: m.role === "user" ? "#111" : "#f4f4f4", color: m.role === "user" ? "#fff" : "#111", padding: "10px 14px", borderRadius: 12, whiteSpace: "pre-wrap" }}>
                <strong>{m.role === "user" ? "You" : "Milo"}:</strong> {m.content}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Describe your idea…" style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ddd" }} />
            <button onClick={send} disabled={busy} style={{ background: "#111", color: "#fff", border: 0, padding: "0 20px", borderRadius: 8, fontWeight: 700 }}>
              {busy ? "Milo is thinking…" : "Send"}
            </button>
          </div>
          <p style={{ color: "#888", fontSize: 13 }}>Try: “I want to sell handmade candles for Nairobi homes, $15 each”</p>
        </div>
      )}

      {tab === "sites" && (
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <h3>Generate a website from your idea</h3>
          <div style={{ display: "grid", gap: 10 }}>
            <input placeholder="Business name (optional)" value={bizName} onChange={(e) => setBizName(e.target.value)} style={{ padding: 12, borderRadius: 8, border: "1px solid #ddd" }} />
            <textarea placeholder="Your idea — e.g. handmade candles for Nairobi homes" value={idea} onChange={(e) => setIdea(e.target.value)} rows={3} style={{ padding: 12, borderRadius: 8, border: "1px solid #ddd" }} />
            <button onClick={generateSite} disabled={busy} style={{ background: "#111", color: "#fff", border: 0, padding: 12, borderRadius: 8, fontWeight: 700 }}>
              {busy ? "Building…" : "Build my site"}
            </button>
          </div>
          {sitePreview && (
            <div style={{ marginTop: 20, border: "1px solid #eee", borderRadius: 12, padding: 16, background: "#fafafa" }}>
              <h2 style={{ marginTop: 0 }}>{sitePreview.title}</h2>
              <p style={{ fontSize: 18 }}>{sitePreview.hero}</p>
              <p>{sitePreview.sub}</p>
              {sitePreview.sections?.map((s: any, i: number) => (
                <div key={i} style={{ marginTop: 12 }}>
                  <h4>{s.heading}</h4>
                  <p>{s.body}</p>
                </div>
              ))}
              <button style={{ background: "#111", color: "#fff", border: 0, padding: "10px 18px", borderRadius: 8, fontWeight: 700 }}>{sitePreview.cta}</button>
            </div>
          )}
          <h4 style={{ marginTop: 24 }}>Your sites</h4>
          {sites.length === 0 ? <p style={{ color: "#888" }}>No sites yet — generate your first one above.</p> : sites.map((s) => (
            <div key={s.id} style={{ borderTop: "1px solid #eee", padding: "10px 0" }}>
              <strong>{s.business_name}</strong> — {s.idea.slice(0, 80)} <span style={{ color: "#888", fontSize: 13 }}>· {new Date(s.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "outreach" && (
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <h3>Outreach — Milo drafts, you approve</h3>
          <p style={{ color: "#555" }}>Nothing sends without your OK. Milo writes the first message; you copy, approve, and send.</p>
          <div style={{ display: "grid", gap: 10 }}>
            <textarea placeholder="Your idea — e.g. handmade candles for Nairobi homes" value={idea} onChange={(e) => setIdea(e.target.value)} rows={2} style={{ padding: 12, borderRadius: 8, border: "1px solid #ddd" }} />
            <input placeholder="Who are you writing to? e.g. local gift shops in Nairobi" value={audience} onChange={(e) => setAudience(e.target.value)} style={{ padding: 12, borderRadius: 8, border: "1px solid #ddd" }} />
            <button onClick={draftOutreach} disabled={busy} style={{ background: "#111", color: "#fff", border: 0, padding: 12, borderRadius: 8, fontWeight: 700 }}>
              {busy ? "Drafting…" : "Draft outreach"}
            </button>
          </div>
          {outreach && (
            <pre style={{ marginTop: 16, whiteSpace: "pre-wrap", background: "#fafafa", border: "1px solid #eee", borderRadius: 12, padding: 16, fontFamily: "inherit", fontSize: 14 }}>{outreach}</pre>
          )}
          {!outreach && <p style={{ color: "#888", fontSize: 13 }}>Milo will write a first message plus send notes. You approve before anything goes out.</p>}
        </div>
      )}

      {tab === "social" && (
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <h3>Social posts — launch week drafts</h3>
          <p style={{ color: "#555" }}>Three posts with hooks and captions, ready to copy-paste once you approve.</p>
          <div style={{ display: "grid", gap: 10 }}>
            <textarea placeholder="Your idea — e.g. handmade candles for Nairobi homes" value={idea} onChange={(e) => setIdea(e.target.value)} rows={2} style={{ padding: 12, borderRadius: 8, border: "1px solid #ddd" }} />
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ padding: 12, borderRadius: 8, border: "1px solid #ddd" }}>
              <option>Instagram</option>
              <option>TikTok</option>
              <option>X</option>
              <option>LinkedIn</option>
              <option>Facebook</option>
            </select>
            <button onClick={draftSocial} disabled={busy} style={{ background: "#111", color: "#fff", border: 0, padding: 12, borderRadius: 8, fontWeight: 700 }}>
              {busy ? "Writing…" : "Draft 3 posts"}
            </button>
          </div>
          {social && (
            <pre style={{ marginTop: 16, whiteSpace: "pre-wrap", background: "#fafafa", border: "1px solid #eee", borderRadius: 12, padding: 16, fontFamily: "inherit", fontSize: 14 }}>{social}</pre>
          )}
        </div>
      )}

      {tab === "payments" && (
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <h3>Get paid with Stripe</h3>
          <p>One offer, one checkout link. Add your Stripe keys in <code>.env.local</code> to go live.</p>
          <button onClick={checkout} style={{ background: "#111", color: "#fff", border: 0, padding: "10px 18px", borderRadius: 8, fontWeight: 700 }}>Create checkout link</button>
        </div>
      )}
    </div>
  );
}
