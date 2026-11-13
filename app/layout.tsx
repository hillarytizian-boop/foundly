import type { Metadata } from "next";
import "./globals.css";
import { FooterGate, TopBarGate } from "@/components/Chrome";

export const metadata: Metadata = {
  title: "Foundly — Build a business that runs on its own",
  description:
    "Foundly is an AI employee named Milo. He builds your website, writes to your customers, drafts your posts and sets up payments — and you approve what goes out.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Progressive enhancement: the app renders correctly without this font. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <TopBarGate />
        <main>{children}</main>
        <FooterGate />
      </body>
    </html>
  );
}
