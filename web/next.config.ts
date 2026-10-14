import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '12mb' },
    useTypeScriptCli: false,
  },
};

export default nextConfig;
