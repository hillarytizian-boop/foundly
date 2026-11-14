import Link from "next/link";
import type { ReactNode } from "react";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export const LEGAL_UPDATED = "13 November 2026";
export const CONTACT_EMAIL = "hello@foundly.app";

type Section = { id: string; title: string; body: ReactNode };

export default function LegalShell({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: Section[];
}) {
  return (
    <>
      <style>{`body{background:#f5f5f7;}`}</style>
      <div className="mk">
        <div className="lg-top">
          <MarketingHeader />
        </div>

        <div className="lg-wrap">
          <div className="lg-head">
            <p className="lg-eyebrow">Legal</p>
            <h1>{title}</h1>
            <p className="lg-intro">{intro}</p>
            <p className="lg-meta">
              Last updated {LEGAL_UPDATED} · Also read our{" "}
              <Link href="/privacy">Privacy Policy</Link> and{" "}
              <Link href="/terms">Terms of Service</Link>.
            </p>
          </div>

          <div className="lg-grid">
            <nav className="lg-toc" aria-label="On this page">
              <p className="lg-toc-title">On this page</p>
              <ol>
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <article className="lg-body">
              {sections.map((s, i) => (
                <section key={s.id} id={s.id}>
                  <h2>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                  </h2>
                  {s.body}
                </section>
              ))}

              <div className="lg-foot">
                <h2 id="contact">
                  <span>✉</span>
                  Questions
                </h2>
                <p>
                  Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will answer.
                  We aim to reply within five working days.
                </p>
              </div>
            </article>
          </div>
        </div>

        <MarketingFooter />
      </div>
    </>
  );
}
