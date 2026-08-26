import type { NextConfig } from "next";

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
};

export default nextConfig;
