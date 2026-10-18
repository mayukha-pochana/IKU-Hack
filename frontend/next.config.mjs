/** @type {import('next').NextConfig} */
// The mobile app (Capacitor) loads the running PhaseZero server, so every route works, including
// /trials/<id>. A fully static build for app stores is opt-in: STATIC_EXPORT=1 npm run build.
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig = staticExport
  ? {
      output: "export",          // static HTML/JS for packaging inside the app
      images: { unoptimized: true },
      trailingSlash: true,
    }
  : {};

export default nextConfig;
