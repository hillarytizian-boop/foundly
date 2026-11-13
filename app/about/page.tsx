import Link from "next/link";

export default function About() {
  return (
    <div className="page-narrow">
      <div className="hero" style={{ paddingTop: 26, textAlign: "left" }}>
        <span className="eyebrow">About Foundly</span>
        <h1 style={{ fontSize: "clamp(26px,4vw,36px)", margin: "6px 0 10px", maxWidth: 620 }}>
          An AI employee, not another chatbot.
        </h1>
        <p style={{ margin: 0, maxWidth: 620 }}>
          Most tools give you a blank box and call it AI. Foundly gives you Milo — an employee with a job:
          build the business, write what it needs, reach the people it needs, and report back.
        </p>
      </div>

      <div className="grid-2" style={{ marginTop: 24 }}>
        <div className="card card-pad">
          <h3>What Milo does today</h3>
          <ul className="small" style={{ paddingLeft: 16, lineHeight: 1.85, color: "var(--ink-2)", margin: "8px 0 0" }}>
            <li>Generates and validates business ideas</li>
            <li>Researches the market and tears down competitors</li>
            <li>Writes a business plan, pricing and pitch narrative</li>
            <li>Builds and updates your website</li>
            <li>Names the brand, sets a palette and logo direction</li>
            <li>Produces your catalogue and price list</li>
            <li>Drafts outreach, social posts and email replies</li>
            <li>Builds prospect lists with qualifying signals</li>
            <li>Writes support macros and weekly reviews</li>
          </ul>
        </div>

        <div className="stack">
          <div className="card card-pad">
            <h3>How we build</h3>
            <ul className="small" style={{ paddingLeft: 16, lineHeight: 1.85, color: "var(--ink-2)", margin: "8px 0 0" }}>
              <li><strong>Milo does the work.</strong> Not advice — artefacts you can use.</li>
              <li><strong>You see him work.</strong> Every task has a status, a credit cost and an audit trail.</li>
              <li><strong>Proof before polish.</strong> One real customer beats a month of branding.</li>
              <li><strong>Honest about limits.</strong> If a step needs a key or a permission, he says so.</li>
            </ul>
          </div>
          <div className="card card-pad">
            <h3>What we won&apos;t do</h3>
            <p className="small muted" style={{ margin: "8px 0 0" }}>
              We won&apos;t pretend an email was sent, a payment was taken or a website was published when it wasn&apos;t.
              Anything irreversible waits for your approval.
            </p>
          </div>
        </div>
      </div>

      <div className="card card-pad-lg" style={{ marginTop: 14, textAlign: "center", padding: "28px 20px" }}>
        <h2 style={{ marginBottom: 4 }}>Start with your idea</h2>
        <p className="small muted" style={{ margin: "0 auto 14px", maxWidth: 400 }}>15 credits, no card. Enough to find out if the idea holds.</p>
        <Link href="/sign-up?returnTo=%2Fworkspace" className="btn">Get started</Link>
      </div>
    </div>
  );
}
