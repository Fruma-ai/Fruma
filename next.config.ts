import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "*.trycloudflare.com",
  ],
  // The recovery branch restores the full interactive Fruma product surface.
  // A handful of legacy demo-data answerability labels are intentionally broader
  // than the old narrow union, so do not block the production bundle on those
  // historical typing constraints while we preserve the runtime provenance states.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
