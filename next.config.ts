import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow importing from src/engine/ (shared game engine)
  typescript: {
    // Engine files use .js extensions in imports — Next.js handles this fine
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
