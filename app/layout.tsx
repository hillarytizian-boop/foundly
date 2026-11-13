import type { Metadata } from "next";
import "./globals.css";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Foundly — An AI employee for anyone with an idea",
  description:
    "Foundly is an AI employee named Milo. He builds your website, writes to your customers, drafts your posts and sets up payments — and you approve what goes out.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopBar />
        <main>{children}</main>
        <footer className="site-footer">
          <div className="site-footer-inner">
            <span><strong>Foundly</strong> — an AI employee for anyone with an idea.</span>
            <span>Milo does the work. You see every move and approve what goes out.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
