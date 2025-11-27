import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  experimental: {
    // @ts-expect-error - turbopack is a valid option but missing in types
    turbopack: {
      root: __dirname,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rjxcpqxhkbfhedhhxbau.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
