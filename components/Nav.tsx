import Link from "next/link";

export default function Nav() {
  return (
    <header style={{ borderBottom: "1px solid #eee", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
      <Link href="/" style={{ fontWeight: 800, fontSize: 20, textDecoration: "none", color: "#111" }}>
        Foundly <span style={{ fontWeight: 400, color: "#666", fontSize: 14 }}>· Milo, your AI employee</span>
      </Link>
      <nav style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <Link href="/about" style={{ textDecoration: "none", color: "#333" }}>About</Link>
        <Link href="/pricing" style={{ textDecoration: "none", color: "#333" }}>Pricing</Link>
        <Link href="/sign-in" style={{ textDecoration: "none", color: "#333" }}>Sign in</Link>
        <Link href="/sign-up" style={{ background: "#111", color: "#fff", padding: "8px 14px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
          Get started
        </Link>
      </nav>
    </header>
  );
}
