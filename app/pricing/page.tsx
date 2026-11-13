import Link from "next/link";

const PLANS = [
  { name: "Free", price: "$0", credits: "15 starting credits + daily allowance", hi: false,
    features: ["Idea generation + validation", "Market brief", "One generated website", "Outreach + social drafts", "Task history + approvals"] },
  { name: "Basic", price: "$25", credits: "200 credits / month", hi: false,
    features: ["Everything in Free", "Publishing + custom domain", "Scheduled automations", "Competitor teardowns", "Document exports"] },
  { name: "Pro", price: "$50", credits: "500 credits / month", hi: true,
    features: ["Everything in Basic", "Autopilot for approved work", "Prospect list building", "Brand + logo direction", "Priority runs"] },
  { name: "Max", price: "$200", credits: "2,500 credits / month", hi: false,
    features: ["Everything in Pro", "Highest background limits", "Multiple businesses", "Website code export", "Direct support"] },
];

const COSTS = [
  ["Idea generation", 1], ["Idea validation", 2], ["Market brief", 3], ["Competitor teardown", 3],
  ["Business plan", 4], ["Website build", 3], ["Brand + logo direction", 2], ["Outreach sequence", 2],
  ["Launch posts", 2], ["Prospect list", 3], ["Weekly review", 1],
];

export default function Pricing() {
  return (
    <div className="page">
      <div className="hero" style={{ paddingTop: 28 }}>
        <span className="eyebrow">Pricing</span>
        <h1 style={{ fontSize: "clamp(26px,4vw,36px)", maxWidth: 620 }}>Start free. Upgrade when Milo is earning for you.</h1>
        <p>Every task shows its credit cost before it runs. Foundly adds no transaction fee — payments go straight to your own Stripe.</p>
      </div>

      <div className="grid-4" style={{ marginTop: 22, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        {PLANS.map((p) => (
          <div key={p.name} className="card card-pad" style={p.hi ? { borderColor: "var(--ink)", boxShadow: "var(--shadow-md)" } : undefined}>
            <div className="spread" style={{ alignItems: "baseline" }}>
              <h3 style={{ margin: 0 }}>{p.name}</h3>
              {p.hi && <span className="badge badge-run">popular</span>}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", margin: "6px 0 0" }}>
              {p.price}<span className="small muted" style={{ fontWeight: 400 }}>{p.price !== "$0" && " /mo"}</span>
            </div>
            <p className="small muted" style={{ margin: "2px 0 10px" }}>{p.credits}</p>
            <ul className="small" style={{ paddingLeft: 16, margin: "0 0 14px", color: "var(--ink-2)", lineHeight: 1.75 }}>
              {p.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <Link href="/sign-up?returnTo=%2Fworkspace" className={p.hi ? "btn" : "btn btn-ghost"}
              style={{ width: "100%", display: "flex" }}>Choose {p.name}</Link>
          </div>
        ))}
      </div>

      <div className="section" style={{ marginTop: 34 }}>
        <div className="grid-2" style={{ gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1fr)" }}>
          <div className="card">
            <div className="card-head"><span>What a credit buys</span><span className="go">cost per task</span></div>
            <div className="rows">
              {COSTS.map(([k, v]) => (
                <div key={k as string} className="row-item">
                  <span>{k as string}</span><strong style={{ fontVariantNumeric: "tabular-nums" }}>{v as number}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <h3>How billing actually works</h3>
            <ul className="small" style={{ paddingLeft: 16, lineHeight: 1.8, color: "var(--ink-2)", margin: "8px 0 0" }}>
              <li>Credits are deducted when a task starts, not when you browse.</li>
              <li>If a run fails, the credits are refunded automatically and logged.</li>
              <li>Approval-gated work is charged on the draft — you can reject it and nothing is sent.</li>
              <li>Stripe fees are yours and set by Stripe. Foundly takes no cut of your sales.</li>
              <li>Plan limits control credits and background execution, not access to your own data.</li>
            </ul>
            <p className="small dim" style={{ marginTop: 12, marginBottom: 0 }}>
              Subscriptions are not metered per token or per minute — a credit is a unit of work.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
