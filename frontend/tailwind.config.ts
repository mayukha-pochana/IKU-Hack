import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Calm, high-contrast healthcare palette. Member 2 owns the design tokens.
      colors: {
        brand: { 50: "#ecfeff", 100: "#cffafe", 500: "#0891b2", 600: "#0e7490", 700: "#155e75", 900: "#164e63" },
      },
      fontSize: { base: ["1.0625rem", "1.6"] },
    },
  },
  plugins: [],
};
export default config;
