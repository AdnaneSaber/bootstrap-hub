import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: false },
  turbopack: {
    root: process.cwd(),
  },
  generateBuildId: async () => "bootstrap-hub-build",
};

export default nextConfig;
