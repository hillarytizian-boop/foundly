"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "I sell handmade candles in Nairobi at $15 each",
  "Draft outreach to boutique gift shops",
  "Build me a landing page for a dog-walking service",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi, I'm Milo — your AI employee. Tell me your idea in one sentence and I'll turn it into a business: site, outreach, social, payments." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("milo_messages").select("role,content")
        .order("created_at", { ascending: true }).limit(20);
      if (data && data.length) setMessages([{ role: "assistant", content: "Welcome back. Here's where we left off." }, ...(data as Msg[])]);
    })();
  }, []);

  useEffect(() => { boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const res = await fetch("/api/milo/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const json = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: json.reply || json.error || "On it." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network hiccup — try again in a moment." }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="page" style={{ maxWidth: 780 }}>
      <div className="spread">
        <div>
          <span className="eyebrow">Your line</span>
          <h1 style={{ margin: "2px 0 0", fontSize: 22 }}>Milo works here</h1>
          <p className="small muted" style={{ margin: "3px 0 0" }}>You see everything he does. Nothing sends without your OK.</p>
        </div>
        <Link href="/workspace" className="btn btn-sm btn-ghost">Workspace</Link>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-pad">
          <div className="chat-scroll" ref={boxRef} style={{ maxHeight: 440 }}>
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-bot"}`}>
                <span className="bubble-name">{m.role === "user" ? "You" : "Milo"}</span>
                {m.content}
              </div>
            ))}
            {busy && <div className="bubble bubble-bot"><span className="bubble-name">Milo</span>Working…</div>}
          </div>
        </div>
        <div style={{ padding: "0 14px 14px" }}>
          {messages.length <= 1 && (
            <div className="row" style={{ gap: 6, marginBottom: 8 }}>
              {STARTERS.map((s) => (
                <button key={s} className="chip" style={{ cursor: "pointer", fontSize: 11.5 }} onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}
          <div className="composer">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Message Milo…" />
            <button onClick={() => send()} disabled={busy} aria-label="Send">{busy ? "…" : "↑"}</button>
          </div>
        </div>
      </div>

      <p className="small dim" style={{ marginTop: 10 }}>
        Try: &ldquo;I want to sell handmade candles for Nairobi homes, $15 each&rdquo;
      </p>
    </div>
  );
}
