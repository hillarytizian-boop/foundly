import type { Metadata } from "next";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Foundly — An AI employee for anyone with an idea",
  description: "Foundly is an AI platform where Milo, your AI employee, turns your idea into something real, runs the business for you, and helps it earn.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", color: "#111", background: "#fff" }}>
        <Nav />
        <main>{children}</main>
        <footer style={{ borderTop: "1px solid #eee", padding: "24px 20px", marginTop: 48, color: "#666", fontSize: 14 }}>
          <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <span><strong>Foundly</strong> — An AI employee for anyone with an idea.</span>
            <span>Milo builds your site, writes for you, and helps you get paid.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
