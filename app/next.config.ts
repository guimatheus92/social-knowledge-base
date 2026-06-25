import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for a small Docker image (run via `node server.js`).
  output: "standalone",
};

export default nextConfig;
