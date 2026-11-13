"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMsg(error.message);
    else router.push("/workspace");
  }

  return (
    <div style={{ maxWidth: 420, margin: "48px auto", padding: "0 20px" }}>
      <h1>Welcome back</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 20 }}>
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: 12, borderRadius: 8, border: "1px solid #ddd" }} />
        <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: 12, borderRadius: 8, border: "1px solid #ddd" }} />
        <button disabled={loading} style={{ background: "#111", color: "#fff", padding: 12, borderRadius: 8, border: 0, fontWeight: 700 }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        {msg && <p style={{ color: "#b00" }}>{msg}</p>}
      </form>
      <p style={{ marginTop: 16 }}>New here? <a href="/sign-up">Create an account</a></p>
    </div>
  );
}
