import type { MetadataRoute } from 'next';
import { LOCALES } from '@/data/locales';
import { publicPath } from '@/lib/locale-path';
import { absoluteUrl } from '@/lib/seo';

// Pages that are noindex and have nothing to offer a crawler. No rule for query URLs: the canonical
// link already points filtered catalogue views at the clean page.
const BLOCKED_ROUTES = ['/cart', '/checkout', '/search'] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: LOCALES.flatMap((locale) => BLOCKED_ROUTES.map((rest) => publicPath(locale, rest))),
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
