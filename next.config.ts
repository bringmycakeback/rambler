import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/suggest": ["./data/figures.json"],
  },
};

export default nextConfig;
