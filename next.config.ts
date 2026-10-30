import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Headless Chromium for rendering social cards; must stay outside the bundle.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;
