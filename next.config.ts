import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Ignore ESLint errors during production build (Vercel)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // serverExternalPackages: ['pdf-parse', 'mammoth'] // Removed to allow Next.js to bundle these modules
};

export default nextConfig;
