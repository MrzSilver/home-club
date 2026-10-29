import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import { buildSecurityHeaders } from './src/lib/security-headers';

const isDev = process.env.NODE_ENV !== 'production';

// Points next-intl at the per-request configuration (locale + messages).
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    localPatterns: [
      { pathname: '/images/**', search: '' },
      { pathname: '/images/products/**', search: '?v=angles-20261029' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: buildSecurityHeaders({ isDev }) }];
  },
};

export default withNextIntl(nextConfig);
