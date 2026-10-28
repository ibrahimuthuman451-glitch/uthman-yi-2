import type { NextConfig } from "next";

/**
 * Security headers are applied globally. A nonce based CSP is intentionally not
 * used because Next.js inline bootstrap scripts would require middleware
 * plumbing; the directives below still block framing, plugin execution and
 * cross-origin script injection while allowing the inline styles Next injects.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    /**
     * Build worker pools are sized from os.cpus() by default. On containers
     * that expose the host's core count (e.g. 180 cores with a 6 GiB memory
     * limit) that spawns far too many workers and the build is OOM-killed.
     * Two workers keep builds reliable; raise this on a dedicated build host.
     */
    cpus: Number(process.env.NEXT_BUILD_CPUS ?? 2),
    workerThreads: false,
  },
  images: {
    // Product photography will be served from an approved storage provider.
    // Add the storage host here once the owner provides real product images.
    remotePatterns: [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
