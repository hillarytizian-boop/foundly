import Link from "next/link";

const CAPS = [
  ["Discover", "Ideas, validation, market briefs and competitor teardowns."],
  ["Plan", "Business plan, pricing, pitch narrative, first 30 days."],
  ["Create", "Website, branding, logo direction, product catalogue."],
  ["Publish", "Page live, prices published, checkout wired to your Stripe."],
  ["Market", "Launch posts, campaigns and content calendars."],
  ["Acquire", "Prospect lists, outreach sequences, follow-up logic."],
  ["Communicate", "Emails, replies and support macros you approve."],
  ["Operate", "Documents, weekly reviews and business admin."],
  ["Automate", "Scheduled runs and Autopilot inside your permissions."],
  ["Monitor", "Every task, credit and approval in one activity feed."],
];

export default function Home() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 20px" }}>
      <p style={{ color: "#666", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", fontSize: 13 }}>Foundly · AI business employee</p>
      <h1 style={{ fontSize: 46, lineHeight: 1.08, margin: "12px 0" }}>An AI employee for anyone with an idea.</h1>
      <p style={{ fontSize: 18, color: "#444", maxWidth: 660 }}>
        <strong>Milo</strong> doesn't just answer questions — he does the work. Describe the business you want and he
        builds the site, writes the outreach, drafts the posts, sets up payments, and keeps running it.
      </p>
      <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
        <Link href="/sign-up?returnTo=%2Fworkspace" style={{ background: "#111", color: "#fff", padding: "12px 20px", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>
          Start with your idea
        </Link>
        <Link href="/pricing" style={{ border: "1px solid #ddd", padding: "12px 20px", borderRadius: 10, textDecoration: "none", color: "#111" }}>
          See pricing
        </Link>
      </div>

      <h2 style={{ marginTop: 56 }}>Three environments, one employee</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 16 }}>
        {[
          ["Home", "Command centre", "What Milo is doing, what's waiting on you, and what he suggests next."],
          ["Build", "Create the assets", "Website, naming, logo direction, catalogue — each approved before it ships."],
          ["Run", "Operate the business", "Outreach, social, support and weekly reviews, on a schedule."],
        ].map(([t, s, d]) => (
          <div key={t} style={{ border: "1px solid #eee", borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "#777", fontWeight: 700 }}>{s}</div>
            <h3 style={{ margin: "4px 0 8px" }}>{t}</h3>
            <p style={{ margin: 0, color: "#555" }}>{d}</p>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 56 }}>The full capability map</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 16 }}>
        {CAPS.map(([t, d]) => (
          <div key={t} style={{ border: "1px solid #eee", borderRadius: 10, padding: 14 }}>
            <strong style={{ fontSize: 14 }}>{t}</strong>
            <p style={{ margin: "4px 0 0", color: "#666", fontSize: 13 }}>{d}</p>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 56 }}>Proof before polish</h2>
      <ul style={{ lineHeight: 1.9, color: "#333", maxWidth: 720 }}>
        <li><strong>You see him work.</strong> Every task is visible, with its cost in credits and its current status.</li>
        <li><strong>You approve what leaves the building.</strong> Outreach, social posts and live-site edits never ship without your yes.</li>
        <li><strong>Honest about limits.</strong> If a step needs a key, a permission or a different plan, Milo says so instead of pretending.</li>
      </ul>

      <div style={{ marginTop: 40, border: "1px solid #eee", borderRadius: 14, padding: 24, background: "#fafafa" }}>
        <h2 style={{ marginTop: 0 }}>Start free — 15 credits, no card</h2>
        <p style={{ color: "#555", marginTop: 0 }}>Enough to validate an idea, build a site and draft your first outreach.</p>
        <Link href="/sign-up?returnTo=%2Fworkspace" style={{ background: "#111", color: "#fff", padding: "12px 20px", borderRadius: 10, textDecoration: "none", fontWeight: 700, display: "inline-block" }}>
          Get started
        </Link>
      </div>
    </div>
  );
}
