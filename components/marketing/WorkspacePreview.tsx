import Link from "next/link";
import { BagIcon, Check, OkCircleIcon, SendIcon } from "./Icons";

// A faithful, static rendering of the real workspace: agent thread on the left,
// the plan in the middle, the generated storefront on the right. Everything is
// markup + CSS — no screenshots, no external assets.

const STEPS = [
  { done: true, title: "Register domain & SSL keys", note: "Domain afterhours.supply mapped via Cloudflare API." },
  { done: true, title: "Generate brand identity & vectors", note: "Colours: Noir, Raw Bone & Sage. 4 format exports ready." },
  { active: true, title: "Publish Drop 01 storefront", note: "Awaiting 1 final product spec photo and size matrix table." },
  { done: false, title: "Connect Stripe payout gateway", note: "Milo connects to your personal merchant ID directly." },
];

export default function WorkspacePreview() {
  return (
    <section className="mk-window" id="product" aria-label="Product preview">
      <div className="mk-window-frame">
        {/* titlebar */}
        <div className="mk-titlebar">
          <div className="mk-lights" aria-hidden>
            <span className="r" /><span className="y" /><span className="g" />
          </div>
          <div className="mk-url">
            <span style={{ color: "#10b981", display: "grid", placeItems: "center" }}><OkCircleIcon /></span>
            <span>foundly.app/workspace/milo-session-084</span>
          </div>
          <div className="mk-live">
            <span className="pulse" />
            <span>Milo is active</span>
          </div>
        </div>

        <div className="mk-workspace">
          {/* ── column 1: agent thread ───────────────────────────── */}
          <div className="mk-col" style={{ gridColumn: "span 4" }}>
            <div className="mk-col-head">
              <div className="mk-agent">
                <span className="mk-agent-av">M</span>
                <div>
                  <b>Milo</b>
                  <span>Chief Operating AI · On duty</span>
                </div>
              </div>
              <span className="mk-session">Session #084</span>
            </div>

            <div className="mk-thread">
              <div className="mk-msg">
                <b>What should I work on today?</b>
                I reviewed our inventory pipeline and I&apos;m ready to launch the streetwear capsule
                &ldquo;AFTERHOURS Drop 01&rdquo;.
              </div>

              <div className="mk-msg ok">
                <div className="ok-head"><Check /> 3 actions completed autonomously</div>
                <p>
                  I&apos;ve connected your custom domain, generated the responsive store layout, and
                  compiled 40 qualified stockists in Nairobi for Drop 01.
                </p>
              </div>

              <div className="mk-msg wait">
                <span className="tag">Waiting for your OK</span>
                <p>
                  Ready to send 12 personalised stockist invites from{" "}
                  <span style={{ fontFamily: "ui-monospace, monospace", color: "#0f172a" }}>wholesale@afterhours.supply</span>.
                </p>
                <div className="mk-msg-actions">
                  <button className="dark" type="button">Approve &amp; send</button>
                  <button className="light" type="button">Review first</button>
                </div>
              </div>
            </div>

            <div className="mk-col-foot">
              <div className="mk-prompt">
                <input placeholder="Message Milo…" aria-label="Message Milo" readOnly />
                <button type="button" aria-label="Send"><SendIcon /></button>
              </div>
            </div>
          </div>

          {/* ── column 2: next steps ─────────────────────────────── */}
          <div className="mk-col alt" style={{ gridColumn: "span 4" }}>
            <div className="mk-steps-head">
              <h4>Your next steps</h4>
              <span className="mk-done-chip">2 of 4 done</span>
            </div>

            <div className="mk-steps">
              {STEPS.map((s) => (
                <div key={s.title} className={`mk-step${s.active ? " active" : ""}${!s.active && !s.done ? " muted" : ""}`}>
                  {s.active ? <span className="mk-spin" aria-hidden /> : s.done ? <span className="mk-tick">✓</span> : <span className="mk-tick ring" aria-hidden />}
                  <div>
                    <b>
                      {s.title}
                      {s.active && <span className="prog">In progress</span>}
                    </b>
                    <p>{s.note}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mk-output">
              <div className="top">
                <span>Milo autonomous output</span>
                <span>94% automated</span>
              </div>
              <div className="mk-bar"><i style={{ width: "94%" }} /></div>
              <p>
                Milo handles server configs, email warming, copy generation and SEO schemas without
                engineering help.
              </p>
            </div>
          </div>

          {/* ── column 3: live sandbox ───────────────────────────── */}
          <div className="mk-col" style={{ gridColumn: "span 4" }}>
            <p className="mk-sandbox-head">Live sandbox preview</p>

            <div className="mk-sandbox">
              <div className="mk-store">
                <div className="mk-store-top">
                  <span>AFTERHOURS®</span>
                  <em>CART (0)</em>
                </div>
                <div className="mk-store-mid">
                  <div className="mk-store-thumb"><BagIcon /></div>
                  <b>Heavyweight Hooded Sweatshirt</b>
                  <span>$115.00 — Noir Black</span>
                </div>
                <button className="mk-store-buy" type="button">Buy now — pre-order</button>
              </div>
              <div className="mk-store-foot">
                <span>Staging: afterhours-store.foundly.site</span>
                <span className="ok">SSL active</span>
              </div>
            </div>

            <div className="mk-services">
              <p>Integrated native services</p>
              <div className="mk-service-grid">
                {["Stripe Connect", "Cloudflare DNS", "Google Workspace", "Slack"].map((s) => (
                  <div key={s} className="mk-service"><i />{s}</div>
                ))}
              </div>
            </div>

            <div className="mk-owned">Everything Milo creates is 100% owned by you.</div>
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <Link href="/workspace/build" className="mk-cta" style={{ fontSize: 12, padding: "7px 14px" }}>
                Open the real workspace
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
