/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',          // Generates static HTML/JS for Capacitor and static hosting
  images: {
    unoptimized: true,       // Required for static export since Next.js image optimization needs a server
  },
  trailingSlash: true,       // Ensures proper routing paths inside the mobile WebView
};

export default nextConfig;