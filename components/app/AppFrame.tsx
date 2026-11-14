"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Dark app chrome for the signed-in product. Deliberately minimal: the
 * reference shows one idea per screen, so there is no persistent sidebar —
 * only a back affordance, a small menu, and the page content.
 */
export default function AppFrame({
  children,
  title,
  subtitle,
  credits,
  back = "/workspace",
  showBack = false,
  bare = false,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  credits?: number | null;
  back?: string;
  showBack?: boolean;
  bare?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);

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
    <div className="app">
      {!bare && (showBack || title) && (
        <header className="a-top">
          {showBack ? (
            <Link href={back} className="a-icon-btn" aria-label="Back">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          ) : null}
          <div>
            {title && <div className="t">{title}</div>}
            {subtitle && <div className="s">{subtitle}</div>}
          </div>
          <div className="r">
            {credits !== null && credits !== undefined && (
              <span className="a-pill">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                </svg>
                {credits}
              </span>
            )}
            <button className="a-icon-btn" aria-label="Menu" onClick={() => setMenu((v) => !v)}>
              <svg width="16" height="4" viewBox="0 0 16 4" fill="currentColor" aria-hidden>
                <circle cx="2" cy="2" r="1.6" /><circle cx="8" cy="2" r="1.6" /><circle cx="14" cy="2" r="1.6" />
              </svg>
            </button>
          </div>
        </header>
      )}

      {menu && (
        <div
          role="menu"
          style={{
            position: "fixed", top: 56, right: 12, zIndex: 50, width: 218,
            background: "#212123", border: "1px solid rgba(255,255,255,.1)",
            borderRadius: 14, padding: 6, boxShadow: "0 22px 50px rgba(0,0,0,.55)",
          }}
        >
          {[
            ["Home", "/workspace"],
            ["Build a site", "/workspace/build"],
            ["Run", "/workspace/run"],
            ["Documents", "/workspace/docs"],
            ["Connections", "/workspace/integrations"],
            ["Full chat", "/line"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenu(false)}
              style={{
                display: "block", padding: "10px 11px", borderRadius: 9, textDecoration: "none",
                color: "#f0f0f2", fontSize: 14,
              }}
            >
              {label}
            </Link>
          ))}
          <div style={{ height: 1, background: "rgba(255,255,255,.08)", margin: "5px 3px" }} />
          <div style={{ padding: "8px 11px", fontSize: 11.5, color: "rgba(255,255,255,.35)", overflow: "hidden", textOverflow: "ellipsis" }}>
            {email ?? ""}
          </div>
          <button
            onClick={signOut}
            style={{
              display: "block", width: "100%", textAlign: "left", background: "none", border: 0,
              padding: "10px 11px", borderRadius: 9, color: "#ff9d9d", fontSize: 14,
              font: "inherit", cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      )}

      {children}
    </div>
  );
}
