import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  output: "standalone",
  devIndicators: false,
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
