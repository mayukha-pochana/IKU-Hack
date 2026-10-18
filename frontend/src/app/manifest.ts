// Web app manifest: lets PhaseZero be added to a phone's home screen and open like an app,
// with the brand app icon and no browser bars. iPhones use app/apple-icon.png instead of these icons.
import type { MetadataRoute } from "next";
import { BRAND } from "@/components/brand/Logo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.tagline,
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf9ff", // launch screen colour, the same as the page background
    theme_color: "#faf9ff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
