import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable Turbopack for Next.js 16 compatibility
  turbopack: {},

  // External packages for server-side rendering (exclude better-sqlite3 for Cloudflare)
  serverExternalPackages: ['better-sqlite3'],

  // Configure webpack for Node.js modules (only for local development)
  webpack: (config, { isServer }) => {
    // Only apply Node.js specific configs when not in Cloudflare environment
    if (isServer && process.env.NODE_ENV !== 'production') {
      config.externals.push({
        'better-sqlite3': 'commonjs better-sqlite3',
      });
    }

    // Optimize for Cloudflare Pages
    if (process.env.CF_PAGES === '1' || process.env.NODE_ENV === 'production') {
      // Reduce bundle size for Cloudflare Pages
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }

    return config;
  },

  // Environment variables
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },

  // Experimental features for Cloudflare compatibility
  experimental: {
    // Enable server components for better performance
    serverComponentsExternalPackages: [],
    // Optimize for edge runtime
    serverActions: {
      allowedOrigins: ['*'],
    },
  },

  // Headers for security and Cloudflare compatibility
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization,X-Requested-With' },
          // Cloudflare specific headers
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
      {
        source: '/((?!api/).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Cache static assets
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  // Optimize images for Cloudflare
  images: {
    // Use Cloudflare Images if available
    loader: 'default',
    // Allow external images from common domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Optimize for production/Cloudflare deployment
  ...(process.env.CF_PAGES === '1' || process.env.NODE_ENV === 'production' ? {
    // Disable source maps in production for smaller bundles
    productionBrowserSourceMaps: false,
    // Enable compression
    compress: true,
    // Optimize CSS
    optimizeCss: true,
  } : {}),
};

export default nextConfig;
