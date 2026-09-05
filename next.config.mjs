// Static security headers applied to every response. The Content-Security-Policy
// is set per-request (with a nonce) in middleware.ts, so it's intentionally not
// here. Sources: OWASP HTTP Headers Cheat Sheet.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained server build for the container image (App Runner).
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  poweredByHeader: false,
  experimental: {
    // Server Actions receive multipart uploads for documents.
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
