"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WordSquiggle } from "./Mascot";

const LINKS = [
  { href: "#product", label: "Product", chev: true },
  { href: "#solutions", label: "Solutions", chev: true },
  { href: "#how-it-works", label: "Resources", chev: true },
  { href: "/pricing", label: "Pricing", chev: false },
  { href: "#security", label: "Security", chev: false },
];

/** Wordmark that sits directly on the sky, like the reference. No white bar. */
export default function MarketingHeader() {
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!cancelled) setSignedIn(Boolean(user));
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <header className="mk-sky-nav">
      <Link href="/" className="mk-wordmark" aria-label="Foundly home">
        <WordSquiggle size={19} />
        <span>Foundly</span>
      </Link>

      <nav className="links" aria-label="Sections">
        {LINKS.map((l) => (
          <a key={l.label} href={l.href}>
            {l.label}
            {l.chev ? (
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M2.5 4.5 6 8l3.5-3.5" />
              </svg>
            ) : null}
          </a>
        ))}
      </nav>

      <div className="right">
        <Link href={signedIn ? "/workspace" : "/sign-in"} className="mk-sky-login">
          {signedIn ? "Workspace" : "Log in"}
        </Link>
        <Link href={signedIn ? "/workspace" : "/sign-up"} className="mk-pill-dark">
          {signedIn ? "Open Foundly" : "Start free"}
        </Link>
        <button
          className="mk-burger"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="14" viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M1 1h20M1 7h20M1 13h20" />
          </svg>
        </button>
      </div>

      {open ? (
        <nav
          aria-label="Mobile sections"
          style={{
            position: "absolute", top: "100%", right: 16, left: 16, zIndex: 20,
            background: "#fff", border: "1px solid rgba(11,18,32,.08)", borderRadius: 16,
            padding: 8, boxShadow: "0 18px 40px -12px rgba(11,30,60,.35)",
            display: "grid", gap: 2, textAlign: "left",
          }}
        >
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                padding: "10px 12px", borderRadius: 10, fontSize: 15, fontWeight: 550,
                color: "#0b0e14", textDecoration: "none",
              }}
            >
              {l.label}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
