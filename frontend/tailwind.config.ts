import type { Config } from "tailwindcss";

// PhaseZero design system tokens (https://claude.ai/artifact/KFUiGpp3rkUzRoYdidtcTT).
// Values live as CSS variables in src/app/globals.css; Tailwind only points at them.
// Shared by Member 1 (landing/onboarding) and Member 2 (dashboard); change via PR.
const v = (name: string) => `var(--${name})`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: v("surface"), raised: v("surface-raised") },
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        ink: { DEFAULT: v("ink"), muted: v("ink-muted") },
        violet: { DEFAULT: v("violet"), text: v("violet-text"), soft: v("violet-soft"), on: v("on-violet") },
        mint: { DEFAULT: v("mint"), text: v("mint-text"), soft: v("mint-soft"), deep: v("mint-deep"), light: v("mint-light") },
        peach: v("peach"),
        success: { DEFAULT: v("success"), soft: v("success-soft") },
        warning: { DEFAULT: v("warning"), soft: v("warning-soft") },
        danger: { DEFAULT: v("danger"), soft: v("danger-soft") },
        focus: v("focus"),
      },
      fontFamily: { sans: [v("font-sans"), "ui-sans-serif", "system-ui", "sans-serif"] },
      fontSize: {
        display: ["48px", { lineHeight: "54px", letterSpacing: "-0.02em", fontWeight: "600" }],
        h1: ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "600" }],
        h2: ["24px", { lineHeight: "32px", fontWeight: "600" }],
        h3: ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "body-lg": ["18px", "28px"],
        body: ["16px", "24px"],
        label: ["14px", { lineHeight: "20px", fontWeight: "500" }],
        caption: ["13px", "18px"],
      },
      spacing: { "space-1": "4px", "space-2": "8px", "space-3": "12px", "space-4": "16px", "space-6": "24px", "space-8": "32px", "space-12": "48px" },
      borderRadius: { sm: "8px", md: "12px", lg: "16px", pill: "999px" },
      boxShadow: { card: v("shadow-card") },
      minHeight: { tap: "44px" },
      minWidth: { tap: "44px" },
    },
  },
  plugins: [],
};
export default config;
