import type { Metadata } from "next";
import LegalShell, { CONTACT_EMAIL } from "@/components/marketing/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service — Foundly",
  description:
    "The agreement between you and Foundly: what the service does, what it costs, what you approve, and what happens if something goes wrong.",
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      intro="These terms are the agreement between you and Foundly. They cover what the service does, what it costs, what you are responsible for, and what happens if something breaks."
      sections={[
        {
          id: "agreement",
          title: "Agreeing to these terms",
          body: (
            <>
              <p>
                By creating an account or using Foundly, you agree to these terms. If you do not
                agree, do not use the service. If you are using Foundly for a company, you confirm
                you have authority to bind that company to these terms.
              </p>
              <p>
                You must be at least 18 years old and able to enter a contract. You are responsible
                for the accuracy of the account details you give us and for keeping your login
                secure.
              </p>
            </>
          ),
        },
        {
          id: "service",
          title: "What Foundly does",
          body: (
            <>
              <p>
                Foundly gives you an AI employee &ldquo;Milo&rdquo; who, from a written brief, can
                generate a business website and publish it at a public address, write brand and
                marketing copy, draft social posts and outreach emails, source prospective
                customers from your brief, and — where you connect a third-party account — publish
                on your instruction.
              </p>
              <p>
                Several things are drafted but not sent. Publishing, sending outreach and going
                live sit behind an approval queue: <strong>nothing reaches a customer or the
                public without your explicit approval.</strong> You can reject any item.
              </p>
              <p>
                We may change, improve or retire features. If we remove something you are actively
                relying on, we will tell you in advance where we reasonably can.
              </p>
            </>
          ),
        },
        {
          id: "ai-limits",
          title: "AI output is not guaranteed",
          body: (
            <>
              <div className="lg-callout">
                <p>
                  <strong>Read this section.</strong> Milo produces drafts using a language model.
                  Output can be inaccurate, incomplete, out of date, or simply wrong — including
                  invented facts, figures, names and quotes. You are responsible for reviewing
                  anything before you publish it or send it to another person.
                </p>
              </div>
              <p>
                We do not warrant that generated copy is factually correct, legally compliant in
                your jurisdiction, free of third-party rights, or fit for a particular purpose. We
                are not your lawyer, accountant or financial adviser, and nothing the service
                produces is professional advice.
              </p>
              <p>
                Market research, prospect lists and pricing suggestions are starting points drawn
                from what you told us — not verified business intelligence.
              </p>
            </>
          ),
        },
        {
          id: "your-content",
          title: "Your content, and what you may not do",
          body: (
            <>
              <p>
                You keep ownership of the briefs, messages and materials you provide, and of the
                content generated for you. You grant us the licence we need to host, process and
                display that content in order to run the service for you.
              </p>
              <p>You agree not to use Foundly to:</p>
              <ul>
                <li>break any law, or help anyone else break one;</li>
                <li>publish content that is defamatory, fraudulent, harassing, or infringes someone else&apos;s intellectual property;</li>
                <li>send unsolicited bulk email, or outreach that breaches anti-spam law (for example CAN-SPAM, GDPR/PECR or Kenya&apos;s Data Protection Act);</li>
                <li>impersonate a person or organisation, or misrepresent who is sending a message;</li>
                <li>distribute malware, phish, or attempt to gain unauthorised access to any system;</li>
                <li>generate sexual content involving minors, or content that sexualises a real person;</li>
                <li>resell or white-label the service without our written agreement;</li>
                <li>
                  probe, scrape or overload the service, or attempt to extract the underlying model
                  or bypass usage limits and credit accounting.
                </li>
              </ul>
              <p>
                You are responsible for the outreach you approve. That includes having a lawful
                basis to contact the people on your list.
              </p>
            </>
          ),
        },
        {
          id: "third-party",
          title: "Connected accounts and third-party services",
          body: (
            <>
              <p>
                When you connect a platform — X, LinkedIn, Facebook, Instagram, TikTok, Slack,
                Gmail, Stripe, and so on — you authorise us to act there on your behalf using the
                access you grant. You confirm you are entitled to grant that access, and that your
                use complies with that platform&apos;s own terms.
              </p>
              <p>
                We do not control those platforms. A post may be rejected, rate-limited, or removed
                by them, and an account may be suspended under their rules. We are not responsible
                for their decisions. If publishing fails, the service reports the platform&apos;s
                actual error rather than claiming success.
              </p>
              <p>
                You can revoke our access at any time by disconnecting the integration in Foundly.
                That deletes our stored token; you may also need to revoke it in the platform&apos;s
                own settings.
              </p>
            </>
          ),
        },
        {
          id: "payments",
          title: "Credits, plans and payment",
          body: (
            <>
              <p>
                Foundly is free to start, with an initial credit allowance. Paid plans are billed
                in advance on a recurring basis and renew automatically until cancelled.
              </p>
              <ul>
                <li>
                  <strong>Credits</strong> — each action shows its credit cost before it runs.
                  Credits are consumed when an action runs, not when it succeeds, because the
                  underlying model work has already happened. Credits are not cash and are not
                  redeemable for money.
                </li>
                <li>
                  <strong>Prices</strong> — shown in the app at the time of purchase. We may change
                  prices, and will give notice before a change applies to your renewal.
                </li>
                <li>
                  <strong>Payment processing</strong> — handled by Stripe. By subscribing you
                  authorise recurring charges to your payment method.
                </li>
                <li>
                  <strong>Cancelling</strong> — you can cancel at any time and keep access until the
                  end of the period you have paid for. We do not automatically refund a period you
                  have already used.
                </li>
                <li>
                  <strong>Refunds</strong> — if a billing error occurred or the service was
                  materially unavailable, contact us and we will put it right. Nothing here removes
                  a refund right you have under mandatory consumer law.
                </li>
                <li>
                  <strong>Your own sales are yours</strong> — when you connect your own Stripe
                  account, customer payments go directly to you. Foundly does not take a cut of
                  your transactions and never holds your customers&apos; money.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "availability",
          title: "Availability and changes",
          body: (
            <p>
              We work to keep Foundly available, but we do not promise uninterrupted service. The
              service depends on third parties — hosting, databases and the model provider — and
              may be unavailable during maintenance, an outage, or an upstream failure. Generated
              pages may be temporarily unreachable for the same reasons.
            </p>
          ),
        },
        {
          id: "termination",
          title: "Suspension and termination",
          body: (
            <>
              <p>
                You may stop using Foundly and delete your account at any time.
              </p>
              <p>
                We may suspend or terminate an account if it is used to break these terms, to
                break the law, to harm another person, or in a way that endangers the service or
                other users. Where it is reasonable to do so, we will tell you why and give you a
                chance to fix it. For serious abuse — fraud, attacks on the service, or content that
                harms someone — we may act immediately.
              </p>
              <p>
                On termination, your generated sites stop being published and your stored
                integration tokens are deleted. Billing records are kept as described in the
                Privacy Policy.
              </p>
            </>
          ),
        },
        {
          id: "liability",
          title: "Disclaimers and limit of liability",
          body: (
            <>
              <p>
                Foundly is provided <strong>&ldquo;as is&rdquo;</strong> and{" "}
                <strong>&ldquo;as available&rdquo;</strong>. To the fullest extent the law allows,
                we disclaim implied warranties of merchantability, fitness for a particular purpose
                and non-infringement.
              </p>
              <p>
                To the fullest extent the law allows, we are not liable for indirect, incidental,
                special, consequential or punitive damages, nor for lost profits, lost revenue, lost
                customers, lost data, or harm to your reputation arising from content you approved
                or from a third party&apos;s conduct.
              </p>
              <p>
                Our total liability for all claims relating to the service is limited to the
                greater of (a) the amount you paid us in the twelve months before the claim, or (b)
                USD 100.
              </p>
              <p>
                Nothing in these terms excludes liability that cannot lawfully be excluded,
                including for death or personal injury caused by negligence, or for fraud.
              </p>
            </>
          ),
        },
        {
          id: "indemnity",
          title: "Your responsibility to us",
          body: (
            <p>
              You agree to cover us for third-party claims, losses and reasonable legal costs that
              arise from your content, from messages or posts you approved, from your breach of
              these terms, or from your breach of another person&apos;s rights — provided we tell
              you promptly and let you participate in the defence.
            </p>
          ),
        },
        {
          id: "law",
          title: "Governing law and disputes",
          body: (
            <p>
              These terms are governed by the laws of Kenya, and the courts of Nairobi have
              exclusive jurisdiction over any dispute — except that either of us may seek relief in
              any court with jurisdiction over the other party where necessary to protect
              intellectual property or prevent harm. Before starting proceedings, please email us:
              most problems are settled in one exchange.
            </p>
          ),
        },
        {
          id: "general",
          title: "The small print that still matters",
          body: (
            <>
              <ul>
                <li>
                  <strong>Whole agreement</strong> — these terms, together with the Privacy Policy
                  and any plan details shown at purchase, are the whole agreement between us.
                </li>
                <li>
                  <strong>Severability</strong> — if one clause is unenforceable, the rest stays in
                  force and the unenforceable part is read down to the minimum necessary.
                </li>
                <li>
                  <strong>No waiver</strong> — if we do not enforce a right once, we have not given
                  it up.
                </li>
                <li>
                  <strong>Assignment</strong> — you may not transfer these terms without our
                  agreement; we may transfer them as part of a merger, acquisition or sale of
                  assets, and we will tell you if that happens.
                </li>
                <li>
                  <strong>Changes to these terms</strong> — we may update them. For a material
                  change we will tell you before it takes effect; continuing to use Foundly after
                  that means you accept the updated terms.
                </li>
              </ul>
              <p>
                Questions about any of this? Email{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
