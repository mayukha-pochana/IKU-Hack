import "./globals.css";
import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import { BRAND } from "@/components/brand/Logo";

// PhaseZero design system: one family, Lexend 400 text / 500 labels / 600 headings and buttons.
const lexend = Lexend({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={lexend.variable}>
      <body>{children}</body>
    </html>
  );
}
