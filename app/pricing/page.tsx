import Link from "next/link";

const PLANS = [
  {
    name: "Free", price: "$0", credits: "15 starting credits + daily allowance", highlight: false,
    features: ["Idea generation + validation", "Market brief", "One generated website", "Outreach + social drafts", "Task history + approvals"],
    cta: "Start free",
  },
  {
    name: "Basic", price: "$25", credits: "200 credits / month", highlight: false,
    features: ["Everything in Free", "Website publishing + custom domain", "Scheduled automations", "Competitor teardowns", "Document exports"],
    cta: "Choose Basic",
  },
  {
    name: "Pro", price: "$50", credits: "500 credits / month", highlight: true,
    features: ["Everything in Basic", "Autopilot for approved workflows", "Prospect list building", "Brand + logo direction", "Priority Milo runs"],
    cta: "Choose Pro",
  },
  {
    name: "Max", price: "$200", credits: "2,500 credits / month", highlight: false,
    features: ["Everything in Pro", "Highest background execution limits", "Multiple businesses", "Website code export", "Direct support"],
    cta: "Choose Max",
  },
];

export default function Pricing() {
  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "48px 20px" }}>
      <h1>Pricing</h1>
      <p style={{ color: "#555", maxWidth: 620 }}>
        Start free. Upgrade when Milo is earning for you. Every task shows its credit cost before it runs, and nothing
        is charged to your customers through Foundly — payments go straight to your own Stripe account.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16, marginTop: 28 }}>
        {PLANS.map((p) => (
          <div key={p.name} style={{ border: p.highlight ? "2px solid #111" : "1px solid #eee", borderRadius: 14, padding: 20, background: "#fff" }}>
            <h3 style={{ margin: 0 }}>{p.name}</h3>
            <p style={{ fontSize: 30, fontWeight: 800, margin: "6px 0 2px" }}>
              {p.price}<span style={{ fontSize: 14, fontWeight: 400 }}>{p.price !== "$0" && "/mo"}</span>
            </p>
            <p style={{ color: "#666", fontSize: 13, marginTop: 0 }}>{p.credits}</p>
            <ul style={{ paddingLeft: 18, color: "#333", fontSize: 14, lineHeight: 1.8 }}>
              {p.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <Link href="/sign-up?returnTo=%2Fworkspace" style={{
              display: "block", textAlign: "center", marginTop: 12, padding: "10px 16px", borderRadius: 8,
              textDecoration: "none", fontWeight: 700,
              background: p.highlight ? "#111" : "#fff", color: p.highlight ? "#fff" : "#111",
              border: p.highlight ? "1px solid #111" : "1px solid #ddd",
            }}>{p.cta}</Link>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 48 }}>What a credit buys</h2>
      <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden", background: "#fff", marginTop: 12 }}>
        {[
          ["Idea generation", "1"], ["Idea validation", "2"], ["Market brief", "3"],
          ["Competitor teardown", "3"], ["Business plan", "4"], ["Website build", "3"],
          ["Brand + logo direction", "2"], ["Outreach sequence", "2"], ["Launch posts", "2"],
          ["Prospect list", "3"], ["Weekly review", "1"],
        ].map(([k, v], i) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderTop: i ? "1px solid #f2f2f2" : "none", fontSize: 14 }}>
            <span>{k}</span><strong>{v} credit{Number(v) > 1 ? "s" : ""}</strong>
          </div>
        ))}
      </div>

      <p style={{ color: "#777", fontSize: 13, marginTop: 20 }}>
        Stripe fees are yours and set by Stripe. Foundly adds no transaction fee. Credit costs are shown on every task
        before you run it.
      </p>
    </div>
  );
}
