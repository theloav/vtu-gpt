import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Ignore ESLint errors during production build (Vercel)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // serverExternalPackages: ['pdf-parse', 'mammoth'] // Removed to allow Next.js to bundle these modules

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push(
        '@napi-rs/canvas',
        'canvas',
        'pdf-parse',
        'pdfjs-dist',
      );
    }
    return config;
  },
};

export default nextConfig;
