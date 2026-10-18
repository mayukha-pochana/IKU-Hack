import type { CapacitorConfig } from "@capacitor/cli";

// The app opens the running PhaseZero frontend. In the iOS Simulator, localhost is this Mac.
// On a real phone, set CAP_SERVER_URL to http://<your Mac's Wi-Fi IP>:3000 and run `npx cap sync`.
const serverUrl = process.env.CAP_SERVER_URL ?? "http://localhost:3000";

const config: CapacitorConfig = {
  appId: "com.careflow.app",
  appName: "PhaseZero",
  webDir: "mobile-shell", // shown only if the server can't be reached
  // In the app, the landing page forwards to sign-in (see components/landing/AppRedirect.tsx).
  server: { url: serverUrl, cleartext: true },
};

export default config;
