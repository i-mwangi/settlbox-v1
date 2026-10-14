import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  output: "standalone",
  devIndicators: false,
  async headers() { return [{ source: "/oauth/:path*", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'none'" }, { key: "X-Frame-Options", value: "DENY" }, { key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "no-store" }] }]; },
  async redirects() {
    return [
      { source: "/batch", destination: "/legacy/batch", permanent: false },
      { source: "/group-payment", destination: "/legacy/group-payment", permanent: false },
      { source: "/move-crypto", destination: "/legacy/move-crypto", permanent: false },
      { source: "/quick-send", destination: "/transfer", permanent: false },
      { source: "/send", destination: "/transfer", permanent: false },
      { source: "/account-management", destination: "/setting?tab=team", permanent: false },
      { source: "/address-book", destination: "/contact-book", permanent: false },
      { source: "/credit-card", destination: "/card", permanent: false },
    ];
  },
};

export default nextConfig;
