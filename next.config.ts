import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Headless Chromium for rendering social cards; must stay outside the bundle.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // Ship Chromium's compressed binary only with the functions that render cards.
  outputFileTracingIncludes: {
    "/api/meta/check": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/admin": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/admin/**": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
