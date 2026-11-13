"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const Icon = ({ d }: { d: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);

const ICON = {
  home: "M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5",
  build: "M12 2.5 21 7v10l-9 4.5L3 17V7l9-4.5ZM3 7l9 4.5L21 7M12 11.5V21",
  run: "M7 4.5v15l13-7.5-13-7.5Z",
  docs: "M6 3h8l4 4v14H6V3Zm8 0v4h4",
  plug: "M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0V8Zm6 9v5",
  chat: "M21 12a8 8 0 0 1-8 8H7l-4 3v-4.5A8 8 0 1 1 21 12Z",
};

type Me = { email: string | null; credits: number | null; plan: string } | null;

export default function TopBar() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me>(null);
  const inWorkspace = pathname.startsWith("/workspace") || pathname === "/line";

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) { setMe({ email: null, credits: null, plan: "free" }); return; }
      const { data } = await supabase.from("profiles").select("credits, plan").eq("id", user.id).maybeSingle();
      if (!cancelled) setMe({ email: user.email ?? "", credits: data?.credits ?? null, plan: data?.plan ?? "free" });
    })();
    return () => { cancelled = true; };
  }, [pathname]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const nav = [
    { href: "/workspace", label: "Home", icon: ICON.home, exact: true },
    { href: "/workspace/build", label: "Build", icon: ICON.build },
    { href: "/workspace/run", label: "Run", icon: ICON.run },
  ];

  return (
    <div className="topbar">
      <div className="topbar-inner">
        <Link href={me?.email ? "/workspace" : "/"} className="brand">
          <span className="brand-mark">F</span>
          <span className="brand-name">Foundly</span>
        </Link>

        <span style={{ width: 1, height: 20, background: "var(--line-2)", margin: "0 2px" }} />

        {inWorkspace ? (
          <nav className="navpill">
            {nav.map((n) => {
              const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} className={active ? "active" : ""}>
                  <Icon d={n.icon} /><span className="lbl">{n.label}</span>
                </Link>
              );
            })}
          </nav>
        ) : (
          <nav className="navpill">
            <Link href="/about" className={pathname === "/about" ? "active" : ""}>About</Link>
            <Link href="/pricing" className={pathname === "/pricing" ? "active" : ""}>Pricing</Link>
            <Link href="/workspace" className={pathname === "/workspace" ? "active" : ""}>Workspace</Link>
          </nav>
        )}

        <div className="topbar-right">
          {inWorkspace && (
            <>
              <Link href="/workspace/docs" className="iconbtn" title="Documents" aria-label="Documents">
                <Icon d={ICON.docs} />
              </Link>
              <Link href="/workspace/integrations" className="iconbtn" title="Integrations" aria-label="Integrations">
                <Icon d={ICON.plug} />
              </Link>
              <Link href="/line" className="iconbtn" title="Chat with Milo" aria-label="Chat with Milo">
                <Icon d={ICON.chat} />
              </Link>
              {me?.credits !== null && me?.credits !== undefined && (
                <Link href="/pricing" className="chip">{me.credits} credits</Link>
              )}
            </>
          )}
          {me?.email ? (
            <button onClick={signOut} className="chip" style={{ cursor: "pointer" }} title={me.email}>
              Sign out
            </button>
          ) : (
            <>
              <Link href="/sign-in" className="chip">Sign in</Link>
              <Link href="/sign-up" className="chip chip-dark">Get started</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
