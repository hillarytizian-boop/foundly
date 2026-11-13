import Link from "next/link";
import { GlobeIcon } from "./Icons";
import { WordSquiggle } from "./Mascot";

const COLS = [
  {
    title: "Product",
    links: [
      ["Start free", "/sign-up"],
      ["Log in", "/sign-in"],
      ["Agent team", "/workspace/build"],
      ["Websites", "/workspace/build"],
      ["Selling online", "/workspace/run"],
      ["Runs it for you", "/workspace/run"],
      ["Marketing", "/workspace/run"],
      ["Integrations", "/workspace/integrations"],
      ["Documents", "/workspace/docs"],
    ],
  },
  {
    title: "Solutions",
    links: [
      ["Small businesses", "/sign-up"],
      ["Creators", "/sign-up"],
      ["Side projects", "/sign-up"],
      ["Browse ideas", "/workspace"],
      ["Pricing", "/pricing"],
      ["About", "/about"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Pricing", "/pricing"],
      ["Workspace", "/workspace"],
      ["Contact", "mailto:hello@foundly.app"],
      ["Terms of Service", "/about"],
      ["Privacy Policy", "/about"],
      ["Security", "/about"],
    ],
  },
];

export default function MarketingFooter() {
  return (
    <footer className="mk-footer">
      <div className="">
        <div className="mk-footer-grid">
          <div className="mk-footer-brand">
            <Link href="/" className="mk-wordmark">
              <WordSquiggle size={18} />
              <span>Foundly</span>
            </Link>
            <p>
              The AI employee that builds and runs your business. Milo writes the site, does the
              outreach, drafts the posts — and you approve everything that goes out.
            </p>
            <div className="loc">Nairobi · London · San Francisco</div>
          </div>

          {COLS.map((c) => (
            <div key={c.title}>
              <h4>{c.title}</h4>
              <ul>
                {c.links.map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith("mailto:") || href.startsWith("http") ? (
                      <a href={href}>{label}</a>
                    ) : (
                      <Link href={href}>{label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mk-footer-bottom">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span>© 2026 Foundly. All rights reserved.</span>
            <span style={{ color: "#cbd5e1" }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <GlobeIcon size={12} /> English (US)
            </span>
          </div>
          <div className="socials">
            <a href="https://github.com/hillarytizian-boop/foundly" target="_blank" rel="noreferrer">GitHub</a>
            <a href="#pricing">Pricing</a>
            <a href="/workspace/integrations">Integrations</a>
            <a href="mailto:hello@foundly.app">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
