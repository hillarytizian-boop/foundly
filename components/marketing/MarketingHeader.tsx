"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CloudMark } from "./Icons";

const LINKS = [
  { href: "#product", label: "Product" },
  { href: "#solutions", label: "Solutions" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#security", label: "Security" },
];

export default function MarketingHeader() {
  const [signedIn, setSignedIn] = useState(false);

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
    <header className="mk-header">
      <div className="mk-header-in">
        <Link href="/" className="mk-logo">
          <span className="mk-logo-mark"><CloudMark size={17} /></span>
          <span className="mk-logo-word">Foundly</span>
        </Link>

        <nav className="mk-nav" aria-label="Sections">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
        </nav>

        <div className="mk-header-actions">
          <Link href={signedIn ? "/workspace" : "/sign-in"} className="mk-login">
            {signedIn ? "Workspace" : "Log in"}
          </Link>
          <Link href={signedIn ? "/workspace" : "/sign-up"} className="mk-cta">
            {signedIn ? "Open Foundly" : "Start free"}
          </Link>
        </div>
      </div>
    </header>
  );
}
