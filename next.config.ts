import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    // We run our own ESLint in the build script (npm run lint).
    // Disable Next.js' built-in lint to avoid double-checking src/ engine files.
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Engine files (src/engine/) use .js extensions in imports (for Node.js/tsx compat).
    // Tell webpack to also try .ts when it sees a .js import.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
