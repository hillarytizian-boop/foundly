"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WordSquiggle } from "@/components/marketing/Mascot";

const NAV = [
  { href: "/workspace", label: "Home", icon: "M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5" },
  { href: "/workspace/build", label: "Build", icon: "M4 20V4h7l9 9-7 7H4Z" },
  { href: "/workspace/run", label: "Run", icon: "M8 5v14l11-7L8 5Z" },
  { href: "/workspace/docs", label: "Documents", icon: "M6 3h8l4 4v14H6V3Z" },
  { href: "/workspace/integrations", label: "Connections", icon: "M9 7h6M9 17h6M6 12h12" },
];

export default function AppFrame({
  children,
  title,
  subtitle,
  credits,
  right,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  credits?: number | string | null;
  right?: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
    })();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="app-shell">
      <aside className={`app-side${open ? " open" : ""}`}>
        <Link href="/" className="app-brand" onClick={() => setOpen(false)}>
          <WordSquiggle size={16} />
          Foundly
        </Link>

        <Link href="/workspace/build" className="app-new" onClick={() => setOpen(false)}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> New build
        </Link>

        <div className="app-nav-label">Workspace</div>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            className={`app-item${path === n.href ? " on" : ""}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={n.icon} />
            </svg>
            {n.label}
          </Link>
        ))}

        <div className="app-side-foot">
          <Link href="/line" className="app-item" onClick={() => setOpen(false)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.9" strokeLinecap="round" aria-hidden>
              <path d="M21 12a8 8 0 1 1-3.2-6.4" />
            </svg>
            Milo chat
          </Link>
          <button className="app-item" onClick={signOut} style={{ width: "100%", background: "none", border: 0, cursor: "pointer", font: "inherit", textAlign: "left" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 17l5-5-5-5M20 12H9M12 21H5V3h7" />
            </svg>
            Sign out
          </button>
          <div className="app-user">
            <i>{(email ?? "M").slice(0, 1).toUpperCase()}</i>
            <span>{email ?? "signed in"}</span>
          </div>
        </div>
      </aside>

      <main className="app-main">
        <div className="app-top">
          <button className="app-burger" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
            <svg width="19" height="13" viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M1 1h20M1 7h20M1 13h20" />
            </svg>
          </button>
          <div>
            <h1>{title}</h1>
            {subtitle && <div className="sub">{subtitle}</div>}
          </div>
          <div className="right">
            {right}
            {credits !== null && credits !== undefined && (
              <span className="app-credits">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                </svg>
                {credits} credits
              </span>
            )}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
