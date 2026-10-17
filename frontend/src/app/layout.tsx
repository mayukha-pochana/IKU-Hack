import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareFlow AI",
  description: "From Trial Discovery to Treatment Adherence, Without the Friction.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
