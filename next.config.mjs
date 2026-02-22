import { createRequire } from "module";
import path from "path";
const require = createRequire(import.meta.url);

const midlViemPath = path.dirname(
  require.resolve("@midl/viem/package.json")
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ["@midl/satoshi-kit"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      viem: midlViemPath,
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
