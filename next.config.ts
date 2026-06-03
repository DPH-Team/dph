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

// Next.js 16 SSRF protection: the image optimizer refuses to fetch upstream
// images that resolve to private/loopback IPs (returns 400 in local dev when
// Supabase Storage is served from 127.0.0.1:54321).  Disabling optimization
// for local dev sidesteps the block without touching prod behaviour.
function isLocalSupabaseHost(): boolean {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return false;
  try {
    const { hostname } = new URL(raw);
    // Loopback / any-address literals
    if (["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(hostname)) {
      return true;
    }
    // RFC-1918 private ranges expressed as dot-decimal IPv4
    const parts = hostname.split(".").map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [a, b, c] = parts;
      if (a === 10) return true;                              // 10.0.0.0/8
      if (a === 192 && b === 168) return true;               // 192.168.0.0/16
      if (a === 172 && b >= 16 && b <= 31) return true;     // 172.16.0.0/12
      // c is read as part of the destructuring; reference it to satisfy lint
      void c;
    }
    return false;
  } catch {
    return false;
  }
}

const derivedSupabasePattern = supabaseStoragePattern();

const nextConfig: NextConfig = {
  images: {
    // Disable optimization only when Supabase Storage is on a local/private
    // host (Next 16 SSRF guard blocks private-IP upstream fetches in dev).
    // Public *.supabase.co hosts in staging/prod are unaffected.
    unoptimized: isLocalSupabaseHost(),
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
