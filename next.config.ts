import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // Server function logging dumps full argument values (e.g. entire LaTeX
  // documents) to the terminal — off since it's unreadable at this size.
  logging: {
    serverFunctions: false,
  },

  // Prevent Node.js-only packages from being bundled into the client
  serverExternalPackages: [
    "ws",
    "bufferutil",
    "@aws-sdk/client-s3",
    "@neondatabase/serverless",
  ],

  experimental: {
    // Better tree-shaking for icon libraries
    optimizePackageImports: ["lucide-react"],
  },

  async redirects() {
    return [
      {
        source: "/core/busytex/busytex.wasm",
        destination: "https://resume-storage.nandan.fyi/public/busytex.wasm",
        permanent: false,
      },
      {
        source: "/core/busytex/busytex.js",
        destination: "https://resume-storage.nandan.fyi/public/busytex.js",
        permanent: false,
      },
      {
        source: "/core/busytex/texlive-extra.data",
        destination:
          "https://qujr12qsco.ufs.sh/f/fthLDAMTNUTlo2DzZXfKNuBGPq0OUSh5TDr7YsjQ9HmIvzRL",
        permanent: false,
      },
    ];
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
