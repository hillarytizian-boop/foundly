import Link from "next/link";

const miloDoes = [
  ["Builds your website", "Milo drafts, builds, and publishes a first version you can share today."],
  ["Makes your logo + email", "Name, tagline, and a business email so you look real from day one."],
  ["Writes to stores + customers", "Outreach drafts you approve — no spam, just first conversations."],
  ["Drafts your social posts", "Hooks and captions for launch week, ready to copy-paste."],
  ["Sets up Stripe payments", "One offer, one checkout link. Get paid without the paperwork."],
];

export default function Home() {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 20px" }}>
      <p style={{ color: "#666", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", fontSize: 13 }}>Foundly · AI idea-to-business platform</p>
      <h1 style={{ fontSize: 44, lineHeight: 1.1, margin: "12px 0" }}>An AI employee for anyone with an idea.</h1>
      <p style={{ fontSize: 18, color: "#444", maxWidth: 640 }}>
        We believe anyone with an idea should be able to start a business. So we built <strong>Milo</strong>, the AI employee who does the work.
      </p>
      <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
        <Link href="/sign-up?returnTo=%2Fline" style={{ background: "#111", color: "#fff", padding: "12px 20px", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>
          Start with your idea
        </Link>
        <Link href="/about" style={{ border: "1px solid #ddd", padding: "12px 20px", borderRadius: 10, textDecoration: "none", color: "#111" }}>
          How it works
        </Link>
      </div>

      <h2 style={{ marginTop: 56 }}>What Milo does today</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 16 }}>
        {miloDoes.map(([t, d]) => (
          <div key={t} style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
            <h3 style={{ margin: "0 0 8px" }}>{t}</h3>
            <p style={{ margin: 0, color: "#555" }}>{d}</p>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 56 }}>How we build</h2>
      <ul style={{ lineHeight: 1.8 }}>
        <li><strong>Milo does the work.</strong> You describe the business. He builds it, writes for it, and reaches out for it.</li>
        <li><strong>You see him work.</strong> What Milo is doing and thinking is on screen while he works.</li>
        <li><strong>Proof before polish.</strong> A first real customer beats a perfect page. We ship what people can react to, then improve it.</li>
      </ul>

      <div style={{ background: "#f7f7f7", borderRadius: 12, padding: 24, marginTop: 48 }}>
        <h2 style={{ marginTop: 0 }}>Who it's for</h2>
        <p>Small businesses, creators, and side projects. Milo keeps working while you sleep.</p>
        <Link href="/sign-up?returnTo=%2Fline" style={{ fontWeight: 700 }}>Get started →</Link>
      </div>
    </div>
  );
}
