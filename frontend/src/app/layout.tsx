import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import { BRAND } from "@/components/brand/Logo";

// PhaseZero design system: one family, Lexend 400 text / 500 labels / 600 headings and buttons.
const lexend = Lexend({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "default" },
};

// Draw edge to edge on phones (under the status bar and home indicator); pages pad themselves with safe-area insets.
// themeColor is the page background, which the gradient fades into at the edges, so tinted browser bars blend in.
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#faf9ff" }, { media: "(prefers-color-scheme: dark)", color: "#141226" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={lexend.variable}>
      <body>{children}</body>
    </html>
  );
}
