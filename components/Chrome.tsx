"use client";
import { usePathname } from "next/navigation";
import TopBar from "./TopBar";

// The marketing homepage brings its own header/footer, so the app pill nav and
// the compact site footer are suppressed there. Every other route keeps them.
// Routes that carry their own header and footer.
const OWN_CHROME = ["/", "/privacy", "/terms"];

export function TopBarGate() {
  const p = usePathname();
  if (OWN_CHROME.includes(p)) return null;
  return <TopBar />;
}

export function FooterGate() {
  const p = usePathname();
  if (OWN_CHROME.includes(p)) return null;
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span><strong>Foundly</strong> — an AI employee for anyone with an idea.</span>
        <span>Milo does the work. You see every move and approve what goes out.</span>
      </div>
    </footer>
  );
}
