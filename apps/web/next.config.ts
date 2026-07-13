import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@nexlex/shared", "@nexlex/db", "@nexlex/tokens"],
};

export default nextConfig;
