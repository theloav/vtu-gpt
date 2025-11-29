import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Ignore ESLint errors during production build (Vercel)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // serverExternalPackages: ['pdf-parse', 'mammoth'] // Removed to allow Next.js to bundle these modules

  webpack: (config, { isServer }) => {
    // Ensure pdfjs-dist and its worker are bundled correctly for serverless functions
    // They are no longer externalized to allow Next.js to handle their bundling.
    // Removed 'pdf-parse', '@napi-rs/canvas', 'canvas' as they are not needed and caused conflicts.
    if (isServer) {
      // No specific externals needed here for PDF processing after dependency cleanup.
      // If other server-side native modules are added later, they might need to be externalized.
    }
    return config;
  },
};

export default nextConfig;
