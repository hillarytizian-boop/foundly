"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { href: "/workspace", label: "Home" },
  { href: "/workspace/build", label: "Build" },
  { href: "/workspace/run", label: "Run" },
  { href: "/workspace/docs", label: "Documents" },
  { href: "/workspace/integrations", label: "Integrations" },
];

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState("free");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) { router.replace("/sign-in?returnTo=/workspace"); return; }
      setEmail(user.email ?? "");
      const { data } = await supabase.from("profiles").select("credits, plan").eq("id", user.id).maybeSingle();
      if (data && !cancelled) { setCredits(data.credits); setPlan(data.plan); }
    })();
    return () => { cancelled = true; };
  }, [router, pathname]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div>
      <div style={{ borderBottom: "1px solid #eee", background: "#fafafa" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "12px 20px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {TABS.map((t) => {
            const active = t.href === "/workspace" ? pathname === t.href : pathname.startsWith(t.href);
            return (
              <Link key={t.href} href={t.href} style={{
                padding: "7px 14px", borderRadius: 999, textDecoration: "none", fontSize: 14, fontWeight: 600,
                background: active ? "#111" : "transparent", color: active ? "#fff" : "#444",
                border: active ? "1px solid #111" : "1px solid transparent",
              }}>{t.label}</Link>
            );
          })}
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center", fontSize: 13, color: "#555" }}>
            <Link href="/pricing" style={{ textDecoration: "none", color: "#111", fontWeight: 700, border: "1px solid #ddd", padding: "5px 10px", borderRadius: 8, background: "#fff" }}>
              {credits === null ? "—" : credits} credits · {plan}
            </Link>
            {email && <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>}
            <button onClick={signOut} style={{ background: "none", border: 0, color: "#666", cursor: "pointer", fontSize: 13 }}>Sign out</button>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 20px 64px" }}>{children}</div>
    </div>
  );
}
