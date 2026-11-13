import Link from "next/link";

export default function Pricing() {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 20px" }}>
      <h1>Pricing</h1>
      <p style={{ color: "#555" }}>Start free. Upgrade when Milo is earning for you.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 24 }}>
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 20 }}>
          <h3>Starter</h3>
          <p style={{ fontSize: 28, fontWeight: 800 }}>$0</p>
          <ul>
            <li>1 idea + Milo chat</li>
            <li>1 generated website</li>
            <li>Outreach + social drafts</li>
          </ul>
          <Link href="/sign-up?returnTo=%2Fline">Start free</Link>
        </div>
        <div style={{ border: "2px solid #111", borderRadius: 12, padding: 20 }}>
          <h3>Builder</h3>
          <p style={{ fontSize: 28, fontWeight: 800 }}>$29<span style={{ fontSize: 14, fontWeight: 400 }}>/mo</span></p>
          <ul>
            <li>Unlimited ideas + sites</li>
            <li>Stripe checkout setup</li>
            <li>Priority Milo runs</li>
          </ul>
          <Link href="/sign-up?returnTo=%2Fline">Start building</Link>
        </div>
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 20 }}>
          <h3>Studio</h3>
          <p style={{ fontSize: 28, fontWeight: 800 }}>$99<span style={{ fontSize: 14, fontWeight: 400 }}>/mo</span></p>
          <ul>
            <li>Everything in Builder</li>
            <li>Team seats + domains</li>
            <li>Human review of outreach</li>
          </ul>
          <Link href="/sign-up?returnTo=%2Fline">Talk to us</Link>
        </div>
      </div>
    </div>
  );
}
