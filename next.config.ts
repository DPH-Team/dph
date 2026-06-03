import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "utfb-images.untappd.com", pathname: "/**" },
      { protocol: "https", hostname: "assets.untappd.com", pathname: "/**" },
      { protocol: "https", hostname: "images-api.printify.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.printify.com", pathname: "/**" },
      { protocol: "https", hostname: "pfy-prod-products-mockup-media.s3.us-east-2.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "**.s3.us-east-2.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "api.mapbox.com", pathname: "/**" },
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
