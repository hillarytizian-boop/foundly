"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignUp() {
  return (
    <Suspense fallback={<div className="page-narrow"><p className="muted">Loading…</p></div>}>
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
    setLoading(true); setMsg("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setMsg(error.message);
    else router.push(returnTo);
  }

  return (
    <div className="page-narrow" style={{ maxWidth: 420, paddingTop: 46 }}>
      <div className="card card-pad-lg">
        <span className="eyebrow">Get started</span>
        <h1 style={{ fontSize: 22, margin: "2px 0 4px" }}>Create your Foundly account</h1>
        <p className="small muted" style={{ margin: "0 0 16px" }}>
          Milo is ready when you are. Describe your idea and he&apos;ll get to work.
        </p>
        <form onSubmit={submit} className="stack" style={{ gap: 9 }}>
          <label className="field"><span>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" />
          </label>
          <label className="field"><span>Password</span>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </label>
          <button className="btn" disabled={loading} style={{ width: "100%", marginTop: 2 }}>
            {loading ? "Creating…" : "Sign up — 15 free credits"}
          </button>
          {msg && <p className="small" style={{ color: "var(--bad)", margin: 0 }}>{msg}</p>}
        </form>
        <p className="small muted" style={{ margin: "12px 0 0" }}>
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
