import Link from "next/link";

const STEPS = [
  ["Meet Milo.", "Your AI employee."],
  ["Say the idea. Milo builds it.", "A website, a name, a logo direction and a business email — done for you."],
  ["He runs it while you sleep.", "Step after step, and you see every move in the activity feed."],
  ["He finds people to reach out to.", "Milo drafts each email and post. You decide what goes out."],
  ["Text him from anywhere.", "Phone or desktop, he's always a message away."],
];

const CAPS = [
  ["Discover", "Ideas, validation, market briefs, competitor teardowns"],
  ["Plan", "Business plan, pricing, pitch narrative, first 30 days"],
  ["Create", "Website, naming, logo direction, product catalogue"],
  ["Publish", "Page live, prices published, checkout on your Stripe"],
  ["Market", "Launch posts, campaigns, content calendars"],
  ["Acquire", "Prospect lists, outreach sequences, follow-ups"],
  ["Communicate", "Emails, replies and support macros you approve"],
  ["Operate", "Documents, weekly reviews, business admin"],
  ["Automate", "Scheduled runs and Autopilot inside your permissions"],
  ["Monitor", "Every task, credit and approval in one place"],
];

export default function Home() {
  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Foundly · AI business employee</span>
        <h1>Build a business that runs on its own.</h1>
        <p>Meet Milo, the AI employee who does the work.</p>

        <form action="/sign-up" method="get" className="ideabox">
          <input name="idea" placeholder="Ask Milo to build a business that…" aria-label="Describe your business idea" />
          <button className="btn" type="submit" style={{ borderRadius: 999, padding: "9px 18px" }}>Start</button>
        </form>

        <div className="feature-strip">
          <span>Website</span><span>Logo &amp; email</span><span>Outreach</span>
          <span>Social posts</span><span>Stripe</span><span>Documents</span><span>Autopilot</span>
        </div>
      </section>

      <section className="section">
        <h2>What Milo does, in order</h2>
        <p className="sub">No prompts to memorise. Describe the outcome; he plans the work and reports what he did.</p>
        <div className="steps" style={{ maxWidth: 760, margin: "0 auto" }}>
          {STEPS.map(([b, s], i) => (
            <div key={b} className="card step">
              <span className="step-n">{i + 1}</span>
              <div><b>{b}</b><span>{s}</span></div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>The whole capability map</h2>
        <p className="sub">Ten areas of work, each with real tasks, real credit costs and an approval gate where it matters.</p>
        <div className="grid-3">
          {CAPS.map(([t, d]) => (
            <div key={t} className="card card-pad">
              <h4 style={{ marginBottom: 3 }}>{t}</h4>
              <p className="small muted" style={{ margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>You see him work</h2>
        <p className="sub">Proof before polish. Every task is visible, costed, and gated where sending is irreversible.</p>
        <div className="grid-3">
          {[
            ["Every task tracked", "Queued, running, waiting for you, done or failed — never a black box."],
            ["Credits before the run", "Each capability shows what it costs. Failed runs are refunded automatically."],
            ["Approval is real", "Outreach, social and live-site edits sit in a queue until you say yes. Rejected means rejected."],
          ].map(([t, d]) => (
            <div key={t} className="card card-pad">
              <h4 style={{ marginBottom: 3 }}>{t}</h4>
              <p className="small muted" style={{ margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="card card-pad-lg" style={{ textAlign: "center", padding: "30px 20px" }}>
          <h2 style={{ marginBottom: 4 }}>Start free — 15 credits, no card</h2>
          <p className="small muted" style={{ margin: "0 auto 16px", maxWidth: 420 }}>
            Enough to validate an idea, build a site and draft your first outreach.
          </p>
          <Link href="/sign-up?returnTo=%2Fworkspace" className="btn">Get started</Link>
        </div>
      </section>
    </div>
  );
}
