import Link from "next/link";
import { CloudMark, ArrowUpRight, Check } from "@/components/marketing/Icons";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import Hero from "@/components/marketing/Hero";

const STEPS = [
  {
    title: "Meet Milo.",
    body: "Your dedicated AI employee. He works continuously — no burnout, no vacations, no technical bottlenecks.",
  },
  {
    title: "Say the idea. Milo builds it.",
    body: "A published site, brand direction, page copy and a business email, all from one sentence.",
  },
  {
    title: "He runs it while you sleep.",
    body: "Step after step, and you see every move: tasks, drafts, approvals and costs in one audit trail.",
  },
  {
    title: "He finds people to reach out to.",
    body: "Prospects sourced from your brief, every email and post drafted for you. You decide what goes out.",
  },
  {
    title: "Text him from anywhere.",
    body: "Phone or desktop, he's a message away. Check status, change a price, or ask for a new campaign.",
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
    "Type your idea into the box at the top of this page. You'll create an account, get 15 free credits, and the agent team will build your first site in one run."],
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
      <style>{`body{background:#f5f5f7;}`}</style>

      <div className="mk">
        <Hero header={<MarketingHeader />} />

        {/* ── proof ─────────────────────────────────────────── */}
        <section className="mk-proof">
          <div className="mk-sec mk-proof-in">
            <div>
              <h2>
                People who studied and built at these places use Foundly to start something of
                their own.
              </h2>
              <div className="mk-logos" aria-label="Where Foundly founders come from">
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
              <p>
                Foundly handles the build, the copy, the outreach and the admin — so one person can
                run a real business without hiring a team first.
              </p>
              <Link href="/sign-up">Start yours <ArrowUpRight /></Link>
            </div>
          </div>
        </section>

        {/* ── how it works ──────────────────────────────────── */}
        <section id="how-it-works" style={{ background: "var(--landing-page)" }}>
          <div className="mk-sec">
            <div style={{ maxWidth: 640 }}>
              <p className="mk-eyebrow">How it works</p>
              <h2 className="mk-h2">From idea to first customer.</h2>
              <p className="mk-p">
                He builds it, runs it, does the outreach and stays a message away.
              </p>
            </div>

            <div className="mk-steps-grid">
              {STEPS.map((s, i) => (
                <div key={s.title} className="mk-stepcard">
                  <div className="n">{i + 1}</div>
                  <b>{s.title}</b>
                  <span>{s.body}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── the work itself: chat + live site ─────────────── */}
        <section id="solutions" style={{ background: "#fff" }}>
          <div className="mk-sec">
            <div style={{ maxWidth: 640 }}>
              <p className="mk-eyebrow">A run, start to finish</p>
              <h2 className="mk-h2">One message in. A real business out.</h2>
              <p className="mk-p">
                This is the actual sequence: a brief, a build, a published site, and the list of
                people to talk to.
              </p>
            </div>

            <div className="mk-demo">
              <div className="mk-chatcard">
                <div className="mk-bubble">
                  <b>Hi, I&apos;m Milo. What are we building?</b>
                </div>
                <div className="mk-bubble me">
                  A coffee roastery in Nairobi. Single-origin beans, sold in monthly drops.
                </div>
                <div className="mk-status">
                  <i /> Worked for 4m 12s · 10 steps
                </div>
                <div className="mk-bubble">
                  <b>Kijani Roasters is live.</b>
                  Site published at /s/kijani-roasters, brand palette and copy set, and the
                  first drop page has a countdown to Friday, 9 PM.
                </div>
                <div className="mk-status">
                  <i /> 3 items waiting on your approval
                </div>
                <div className="mk-composer">
                  <span>Message Milo…</span>
                  <span className="dot">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 19V5M6 11l6-6 6 6" />
                    </svg>
                  </span>
                </div>
              </div>

              <div className="mk-canvas">
                <div className="mk-canvas-bar">
                  <CloudMark size={13} />
                  <span className="url">kijani.coffee</span>
                  <span style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
                    {["Google", "Email", "Stripe", "Website"].map((c) => (
                      <span
                        key={c}
                        style={{
                          border: "1px solid rgba(11,18,32,.1)", borderRadius: 999,
                          padding: "2px 7px", fontSize: 10.5, fontWeight: 600,
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </span>
                </div>
                <div className="mk-canvas-body">
                  <div className="mk-site-card">
                    <div className="hd"><span>KIJANI</span><span>Cart (0)</span></div>
                    <div className="hero">
                      <b>This month&apos;s drop</b>
                      <span>Nyandarua AA · roasted Tuesday · ships Friday</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {["Nyandarua AA", "Kirinyaga Peaberry"].map((b) => (
                        <div key={b} style={{ border: "1px solid rgba(11,18,32,.08)", borderRadius: 8, padding: 8 }}>
                          <div style={{ height: 44, borderRadius: 5, background: "linear-gradient(135deg,#e7e2da,#cfc6b9)", marginBottom: 6 }} />
                          <div style={{ fontSize: 11.5, fontWeight: 650 }}>{b}</div>
                          <div style={{ fontSize: 11, color: "#5c6678" }}>$18 · 250g</div>
                        </div>
                      ))}
                    </div>
                    <button className="buy" type="button">Pre-order the drop</button>
                  </div>
                </div>
                <div className="mk-canvas-foot">
                  <span>kijani.coffee</span>
                  <span>published · 2m ago</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── what he hands you ─────────────────────────────── */}
        <section style={{ background: "var(--landing-page)" }}>
          <div className="mk-sec">
            <div style={{ maxWidth: 640 }}>
              <p className="mk-eyebrow">What&apos;s in the folder</p>
              <h2 className="mk-h2">Everything, made and ready to send.</h2>
              <p className="mk-p">Brand, copy, collateral and a prospect list — drafted, not promised.</p>
            </div>

            <div className="mk-art-grid">
              <div className="mk-art">
                <div className="k">Brand</div>
                <b>Kijani Roasters</b>
                <p>Name, palette, type and a one-line positioning statement.</p>
                <div className="mk-art-body">
                  <div className="mk-brandbox">KIJANI</div>
                  <div className="mk-swatch-row">
                    <div style={{ background: "#0f2e22", color: "#fff" }}>0F2E</div>
                    <div style={{ background: "#2f7d5b", color: "#fff" }}>2F7D</div>
                    <div style={{ background: "#d9c8a9" }}>D9C8</div>
                    <div style={{ background: "#f4efe6" }}>F4EF</div>
                  </div>
                </div>
              </div>

              <div className="mk-art">
                <div className="k">Social</div>
                <b>Three posts, queued</b>
                <p>Held in the approval queue until you say go.</p>
                <div className="mk-art-body">
                  <div className="mk-post">
                    <div className="ph"><i /> kijani.coffee</div>
                    <div className="img" />
                    <p>Friday, 9 PM. Nyandarua AA, 240 bags. No restock.</p>
                  </div>
                </div>
              </div>

              <div className="mk-art">
                <div className="k">Outreach</div>
                <b>Milo&apos;s draft</b>
                <p>Boutique prospects, sourced from your brief. Not sent.</p>
                <div className="mk-art-body">
                  {[
                    ["Somewhere Supply", "Westlands"],
                    ["Second Shift", "Kilimani"],
                    ["Static Goods", "Karen"],
                  ].map(([n, a]) => (
                    <div key={n} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px solid rgba(11,18,32,.05)" }}>
                      <b style={{ fontWeight: 650 }}>{n}</b>
                      <span style={{ color: "#6b7383" }}>{a}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
                    {["Send", "Edit", "Decline"].map((a, i) => (
                      <span
                        key={a}
                        style={{
                          flex: 1, textAlign: "center", fontSize: 11, fontWeight: 650, padding: "5px 0",
                          borderRadius: 6,
                          background: i === 0 ? "#111318" : "#fff",
                          color: i === 0 ? "#fff" : "#3c4454",
                          border: i === 0 ? "1px solid #111318" : "1px solid rgba(11,18,32,.12)",
                        }}
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mk-art wide">
                <div className="k">Ledger</div>
                <b>Every step, every credit</b>
                <p>The full audit trail for this run — the same table you see in the workspace.</p>
                <div className="mk-art-body">
                  <table className="mk-table">
                    <thead>
                      <tr><th>Step</th><th>Agent</th><th>State</th><th style={{ textAlign: "right" }}>Cost</th></tr>
                    </thead>
                    <tbody>
                      {[
                        ["Brief", "Milo", "done", "1"],
                        ["Positioning", "Strategist", "done", "2"],
                        ["Site build", "Builder", "done", "3"],
                        ["A11y audit", "Reviewer", "done", "1"],
                        ["Publish", "Publisher", "approved", "0"],
                      ].map(([a, b, c, d]) => (
                        <tr key={a}>
                          <td>{a}</td>
                          <td>{b}</td>
                          <td>{c}</td>
                          <td className="num">{d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── security ──────────────────────────────────────── */}
        <section className="mk-dark" id="security">
          <div className="mk-sec" style={{ paddingTop: 0, paddingBottom: 0 }}>
            <div className="mk-dark-grid">
              <div>
                <p className="mk-eyebrow" style={{ color: "rgba(255,255,255,.45)" }}>Guardrails</p>
                <h2 className="mk-h2" style={{ color: "#fff" }}>
                  It does the work. You keep the keys.
                </h2>
                <p className="mk-p">
                  Milo acts in your accounts, under your approval, with a complete record of what he
                  did and what it cost.
                </p>
              </div>

              <div className="mk-rows">
                {CHECKS.map(([t, d], i) => (
                  <div key={t} className="mk-rowline">
                    <span className="n">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <b>
                        <Check size={11} /> {t}
                      </b>
                      <span>{d}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── faq ───────────────────────────────────────────── */}
        <section id="pricing" style={{ background: "var(--landing-page)" }}>
          <div className="mk-sec">
            <div className="mk-faq">
              <p className="mk-eyebrow">FAQ</p>
              <h2 className="mk-h2">Questions, answered.</h2>
              <div style={{ marginTop: 20 }}>
                {FAQ.map(([q, a]) => (
                  <details key={q}>
                    <summary>
                      <span>{q}</span>
                      <span className="chev">⌄</span>
                    </summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
              <div style={{ marginTop: 26 }}>
                <Link
                  href="/pricing"
                  className="mk-pill-dark"
                  style={{ background: "#111318", padding: "12px 22px" }}
                >
                  See plans &amp; credit costs <ArrowUpRight />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── closing cta ───────────────────────────────────── */}
        <section style={{ background: "var(--landing-page)", padding: "0 20px 60px" }}>
          <div style={{ maxWidth: 1220, margin: "0 auto" }}>
            <div className="mk-close">
              <MiloCloudInline />
              <h2>Milo&apos;s ready. Are you?</h2>
              <form action="/sign-up" method="get" className="mk-ask" style={{ maxWidth: 620 }}>
                <textarea
                  name="idea"
                  rows={2}
                  placeholder="Ask Milo to build a business that…"
                  aria-label="Describe your business idea"
                />
                <div className="mk-ask-foot">
                  <button className="mk-send" type="submit" aria-label="Start with Milo">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 19V5M6 11l6-6 6 6" />
                    </svg>
                  </button>
                </div>
              </form>
              <p className="note">Free to start · No technical setup required · Live in minutes</p>
            </div>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </>
  );
}

function MiloCloudInline() {
  return (
    <svg viewBox="0 0 120 88" width="86" height="63" aria-hidden style={{ marginBottom: 12 }}>
      <defs>
        <radialGradient id="cl" cx="42%" cy="34%" r="78%">
          <stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#eaf1fb" />
        </radialGradient>
      </defs>
      <g fill="url(#cl)">
        <circle cx="40" cy="34" r="24" /><circle cx="70" cy="27" r="21" />
        <circle cx="88" cy="48" r="17" /><rect x="16" y="46" width="78" height="26" rx="13" />
        <circle cx="27" cy="55" r="14" />
      </g>
      <path d="M46 48c3-4.5 7-4.5 10 0" fill="none" stroke="#1b2430" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M64 47c3-4.5 7-4.5 10 0" fill="none" stroke="#1b2430" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}
