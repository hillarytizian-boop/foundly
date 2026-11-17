"use client";
import { usePathname } from "next/navigation";
import TopBar from "./TopBar";

// The marketing homepage brings its own header/footer, so the app pill nav and
// the compact site footer are suppressed there. Every other route keeps them.
//
// The match is a PREFIX, not an exact list: /workspace/build, /workspace/run
// and friends are inside the signed-in app, and rendering the marketing pill
// nav + footer around them is what made the product look like two different
// websites stacked on top of each other.
const OWN_CHROME = ["/", "/privacy", "/terms", "/line", "/connect"];
const APP_PREFIXES = ["/workspace"];

function ownsChrome(pathname: string) {
  if (OWN_CHROME.includes(pathname)) return true;
  return APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function TopBarGate() {
  const p = usePathname();
  if (ownsChrome(p)) return null;
  return <TopBar />;
}

export function FooterGate() {
  const p = usePathname();
  if (ownsChrome(p)) return null;
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span><strong>Foundly</strong> — an AI employee for anyone with an idea.</span>
        <span>Milo does the work. You see every move and approve what goes out.</span>
      </div>
    </footer>
  );
}
