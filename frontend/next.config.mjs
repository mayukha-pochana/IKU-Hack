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
  : {
      // Same-origin API: with NEXT_PUBLIC_API_URL="" the app calls /api/*, proxied here to the backend. This lets one
      // public HTTPS link (the web demo gateway) serve the whole app, cookies included.
      async rewrites() {
        const target = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8010";
        return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
      },
    };

export default nextConfig;
