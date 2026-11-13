"use client";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignUp() {
  return (
    <Suspense fallback={<div style={{ maxWidth: 420, margin: "48px auto", padding: "0 20px" }}>Loading…</div>}>
      <SignUpInner />
    </Suspense>
  );
}

function SignUpInner() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("returnTo") || "/workspace";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setMsg(error.message);
    else router.push(returnTo);
  }

  return (
    <div style={{ maxWidth: 420, margin: "48px auto", padding: "0 20px" }}>
      <h1>Create your Foundly account</h1>
      <p style={{ color: "#555" }}>Milo is ready when you are. Describe your idea and he'll get to work.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 20 }}>
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: 12, borderRadius: 8, border: "1px solid #ddd" }} />
        <input type="password" required placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: 12, borderRadius: 8, border: "1px solid #ddd" }} />
        <button disabled={loading} style={{ background: "#111", color: "#fff", padding: 12, borderRadius: 8, border: 0, fontWeight: 700 }}>
          {loading ? "Creating…" : "Sign up"}
        </button>
        {msg && <p style={{ color: "#b00" }}>{msg}</p>}
      </form>
      <p style={{ marginTop: 16 }}>Already have an account? <a href="/sign-in">Sign in</a></p>
    </div>
  );
}
