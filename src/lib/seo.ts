import type { Locale } from '@/data/schema';
import { segmentToCurrency } from '@/lib/currency';
import { env } from '@/lib/env';

// Open Graph writes a locale as language_TERRITORY. Thai is th_TH; English is the US form the site's
// formatting already uses (en-US in lib/money.ts).
const OPEN_GRAPH_LOCALE: Readonly<Record<Locale, string>> = { en: 'en_US', th: 'th_TH' };

export type OpenGraphLocales = { locale: string; alternateLocale: string[] };

/** `og:locale` for a page and `og:locale:alternate` for the other languages it exists in. */
export function openGraphLocales(locale: Locale): OpenGraphLocales {
  return {
    locale: OPEN_GRAPH_LOCALE[locale],
    alternateLocale: (Object.keys(OPEN_GRAPH_LOCALE) as Locale[])
      .filter((other) => other !== locale)
      .map((other) => OPEN_GRAPH_LOCALE[other]),
  };
}

/**
 * Absolute URL for a public path ("/en/shop", "/images/products/x.webp"), resolved against the site
 * origin (`NEXT_PUBLIC_SITE_URL`, or `siteUrl` when a test or caller supplies one). Structured data
 * and the sitemap need absolute URLs and must never expose the hidden currency segment (ADR-0003), so
 * an internal path such as "/en/usd/shop" is a programming error and throws instead of leaking out.
 */
export function absoluteUrl(path: string, siteUrl: string = env.NEXT_PUBLIC_SITE_URL): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new RangeError(`absoluteUrl needs a root-relative path, received "${path}"`);
  }
  const pathname = path.split(/[?#]/, 1)[0] ?? '';
  if (pathname.split('/').some((segment) => segmentToCurrency(segment) !== null)) {
    throw new RangeError(`absoluteUrl needs a public path, received internal path "${path}"`);
  }
  return new URL(path, siteUrl).href;
}
