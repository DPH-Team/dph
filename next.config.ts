import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "utfb-images.untappd.com", pathname: "/**" },
      { protocol: "https", hostname: "assets.untappd.com", pathname: "/**" },
      { protocol: "https", hostname: "images-api.printify.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.printify.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
