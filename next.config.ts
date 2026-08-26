import type { NextConfig } from "next";

const SCRIPT_SRC = [
  "'self'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  "https://js.stripe.com",
  "https://vercel.live",
].join(" ");

const CONNECT_SRC = [
  "'self'",
  "https://api.stripe.com",
  "https://*.stripe.com",
  "https://vercel.live",
  "wss://*.pusher.com",
  "https://*.pusher.com",
  "https://*.supabase.co",
].join(" ");

const CSP = [
  "default-src 'self'",
  `script-src ${SCRIPT_SRC}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  `connect-src ${CONNECT_SRC}`,
  "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com https://*.stripe.com",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer", "puppeteer-core", "@puppeteer/browsers"],
  outputFileTracingExcludes: {
    "*": [
      "**/.cache/puppeteer/**",
      "**/chrome-headless-shell/**",
      "**/chrome-headless-shell-linux64/**",
      "**/chrome-linux64/**",
      "**/chrome-win64/**",
      "**/chrome-mac*/**",
      "**/.data/**",
      "**/.env.local",
      "**/.env*.local",
      "**/.git/**",
      "**/approved-assets/**",
      "**/ops/fab-5/campaigns/**",
      "**/scripts/**",
    ],
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

