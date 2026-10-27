import type { NextConfig } from 'next';

import { buildSecurityHeaders } from './src/lib/security-headers';

const isDev = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [{ source: '/:path*', headers: buildSecurityHeaders({ isDev }) }];
  },
};

export default nextConfig;
