import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

// Derive a remotePattern from NEXT_PUBLIC_SUPABASE_URL so that local dev
// (http://127.0.0.1:54321) and any staging/prod host are all accepted without
// hardcoding.  next.config.ts is evaluated after Next.js loads .env* files, so
// process.env is fully populated here at build / dev-server start time.
function supabaseStoragePattern(): RemotePattern | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: "/storage/v1/object/public/**",
    };
  } catch {
    return null;
  }
}

const derivedSupabasePattern = supabaseStoragePattern();

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
      // Fallback wildcard: covers prod even when the env var is absent at build time.
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" },
      // Derived pattern: resolves to the actual host/port/protocol from the env
      // var, which handles local CLI dev (http://127.0.0.1:54321) transparently.
      ...(derivedSupabasePattern ? [derivedSupabasePattern] : []),
    ],
  },
};

export default nextConfig;
