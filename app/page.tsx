import Link from "next/link";
import { CloudMark, ArrowRight, ArrowUpRight, Check } from "@/components/marketing/Icons";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import Hero from "@/components/marketing/Hero";
import WorkspacePreview from "@/components/marketing/WorkspacePreview";
import ArtefactGallery from "@/components/marketing/ArtefactGallery";

const STEPS = [
  {
    title: "Meet Milo",
    body: "Your dedicated AI employee who operates continuously — no burnout, no vacations, no technical bottlenecks.",
    foot: "Always online, in your pocket",
  },
  {
    title: "Say the idea. Milo builds it.",
    body: "A website, brand direction, page copy and a business email — all prepared for you, from one sentence.",
    foot: "Brand identity created in seconds",
  },
  {
    title: "He runs it while you sleep",
    body: "Step after step, and you see every move. A complete audit trail of tasks, drafts, approvals and costs.",
    foot: "100% transparent audit log",
  },
  {
    title: "He finds people to reach out to",
    body: "He drafts every email and post for you. You decide what goes out. Prospective buyers sourced from your brief.",
    foot: "You keep full editorial control",
  },
  {
    title: "Text him from anywhere",
    body: "Phone or desktop, he's always a message away. Check status, update prices, or ask him to draft a new campaign.",
    foot: "",
    pills: ["Web dashboard", "Workspace chat", "Email drafts", "Social posts"],
  },
];

const CHECKS = [
  ["Your website, published", "A real page at /s/your-business, live in seconds — not a mockup."],
  ["Payments, in your name", "Connect your own Stripe. Foundly takes 0% transaction fee."],
  ["Email and posts, with your OK", "Nothing reaches customers without your explicit sign-off."],
  ["The whole team, in one run", "Strategist, Builder, Reviewer and Publisher, with every note visible."],
  ["Your data stays yours", "Tokens are stored server-side only. Nothing is used to train public models."],
];

const FAQ = [
  ["What is Foundly?",
    "Foundly gives you Milo, an AI employee who builds and runs your business. He sets up your website and brand assets, writes copy, sources leads, drafts social posts and handles admin on your behalf."],
  ["Do I need to know how to code?",
    "Not at all. You describe the business in plain English. Milo writes the page, assembles it, audits it for accessibility and compliance, and publishes it for you."],
  ["How do I get started?",
    "Type your idea into the prompt at the top of this page. You'll create an account, get 15 free credits, and the agent team will build your first site in one run."],
  ["Does Milo do anything without asking me?",
    "No. Sending outreach, publishing social posts and going live with a site all sit behind an approval queue until you say yes. Rejected means rejected."],
  ["How much does it cost?",
    "Free to start with 15 credits. Every task shows its credit cost before it runs. Paid plans start at $25/month, and Foundly adds zero transaction fee on your Stripe payments."],
  ["Do I own what Milo makes?",
    "Yes, 100%. The HTML, copy, brand direction, documents and customer lists are yours. Site HTML can be exported at any time."],
  ["Can Milo take payments for me?",
    "Once you connect Stripe, customer payments deposit straight into your own account. Foundly never sits in the middle of the money."],
];

export default function Home() {
  return (
    <>
      <style>{`body{background:#fafbfc;}`}</style>

      <aside className="mk-ann">
        <span className="dot" />
        <span>The Foundly agent team is live — building and publishing sites 24/7.</span>
        <a href="#how-it-works">See how it works →</a>
      </aside>

      <MarketingHeader />
      <Hero />
      <WorkspacePreview />

      {/* ── social proof ─────────────────────────────────────── */}
      <section className="mk-proof mk-wrap">
        <div className="mk-proof-grid">
          <div>
            <p className="mk-logos-label">Built by people who shipped at</p>
            <div className="mk-logos">
              <span className="serif">Stanford</span>
              <span className="serif">Duke</span>
              <span>Google</span>
              <span style={{ letterSpacing: "-0.05em" }}>stripe</span>
              <span className="mono">OpenAI</span>
              <span>shopify</span>
              <span className="serif">MIT</span>
              <span className="wide">COSTCO</span>
            </div>
          </div>

          <div className="mk-proof-card">
            <h3>Thousands of people have signed up to use Foundly, including founders from top teams.</h3>
            <p>
              People who studied and built at these places use Foundly to start something of their
              own without spending months writing code.
            </p>
            <Link href="/sign-up">Start yours <ArrowUpRight /></Link>
          </div>
        </div>
      </section>

      {/* ── how it works ─────────────────────────────────────── */}
      <section className="mk-how" id="how-it-works">
        <div className="mk-wrap mk-section">
          <div style={{ maxWidth: 680 }}>
            <span className="mk-eyebrow">How Milo works</span>
            <h2 className="mk-h2">From idea to first customer.</h2>
            <p className="mk-lead">He builds it, runs it, does the outreach and is a message away.</p>
          </div>

          <div className="mk-how-grid">
            {STEPS.map((s, i) => (
              <div key={s.title} className="mk-card">
                <div className="mk-card-num">{i + 1}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                {s.pills ? (
                  <div className="mk-pill-row">
                    {s.pills.map((p) => <span key={p}>{p}</span>)}
                  </div>
                ) : (
                  <div className="foot">{s.foot}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <ArtefactGallery />

      {/* ── dark showcase ────────────────────────────────────── */}
      <section className="mk-dark" id="security">
        <div className="mk-wrap">
          <div className="mk-dark-grid">
            <div>
              <span className="mk-eyebrow">Everything, handled</span>
              <h2>Everything a business needs, handled.</h2>
              <p className="lead">
                Milo sets it all up in your name, on the tools real businesses run on, and checks
                with you before anything goes out.
              </p>
              <div className="mk-check-list">
                {CHECKS.map(([t, d]) => (
                  <div key={t} className="mk-check">
                    <i><Check size={10} /></i>
                    <div><b>{t}</b><span>{d}</span></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mk-orb-wrap">
              <div className="mk-orb">
                <div className="mk-core">
                  <CloudMark size={34} />
                  <span style={{ marginTop: 4 }}>MILO CORE</span>
                </div>
                <div className="mk-orbit t">Stripe Connect</div>
                <div className="mk-orbit b">Vercel Edge</div>
                <div className="mk-orbit l">Google Workspace</div>
                <div className="mk-orbit r">Supabase</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── impact ───────────────────────────────────────────── */}
      <section className="mk-impact">
        <div className="mk-wrap">
          <div className="mk-impact-grid">
            <div>
              <h2 className="mk-h2">Start with an idea. End with something real.</h2>
              <p className="mk-lead">
                Foundly is built for one person with a business in their head and no time to spend
                three months writing code. Bring the idea — the team does the rest.
              </p>
            </div>
            <div className="mk-impact-stats">
              <div className="mk-stat-big">
                <p className="k">Businesses started</p>
                <p className="v">One brief</p>
                <p className="n">Site, brand, copy and outreach from a single description.</p>
              </div>
              <div className="mk-stat-big sky">
                <p className="k">Agents per build</p>
                <p className="v">Four</p>
                <p className="n">Strategist, Builder, Reviewer and Publisher, in sequence.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── faq ──────────────────────────────────────────────── */}
      <section className="mk-faq mk-wrap" id="pricing">
        <h2 className="mk-h2">Questions, answered.</h2>
        <p className="mk-lead" style={{ marginBottom: 18 }}>
          Everything you need to know about working with your new AI employee.
        </p>
        <div style={{ borderTop: "1px solid #e2e8f0" }}>
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>
                <span>{q}</span>
                <span className="chev">↓</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
        <div style={{ marginTop: 26 }}>
          <Link href="/pricing" className="mk-cta mk-cta-lg">
            See plans &amp; credit costs <ArrowRight />
          </Link>
        </div>
      </section>

      {/* ── cta ──────────────────────────────────────────────── */}
      <section className="mk-wrap" style={{ paddingBottom: 56 }}>
        <div className="mk-cta-cloud">
          <div className="orn"><CloudMark size={22} /></div>
          <h2>Milo&apos;s ready. Are you?</h2>
          <form action="/sign-up" method="get" className="mk-prompt">
            <input name="idea" placeholder="Ask Milo to build a business…" aria-label="Describe your business idea" />
            <button className="mk-cta" type="submit" aria-label="Start"><ArrowRight size={13} /></button>
          </form>
          <p className="note">Free to start · No technical setup required · Live in minutes</p>
        </div>
      </section>

      <MarketingFooter />
    </>
  );
}
