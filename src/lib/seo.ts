import type { Locale } from '@/data/schema';
import { segmentToCurrency } from '@/lib/currency';
import { env } from '@/lib/env';
import { languageAlternates, type LanguageAlternates } from '@/lib/locale-path';

/** Brand name for metadata and structured data; mirrors `common.brandName` in the message catalogues. */
export const BRAND_NAME = 'Home Club Foundation';

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

/**
 * The slice of Next.js `Metadata` this builder fills. Declared here because `lib/` may not import
 * Next.js (RULES 3.4); it is structurally assignable to `Metadata`, which `generateMetadata` checks.
 */
export type PageMetadata = {
  title: string | { absolute: string };
  description: string;
  alternates: LanguageAlternates;
  openGraph: OpenGraphLocales & {
    type: 'website' | 'article';
    siteName: string;
    title: string;
    description: string;
    url: string;
  };
  twitter: { card: 'summary_large_image'; title: string; description: string };
  robots?: { index: false; follow: true };
};

export type PageMetadataInput = {
  locale: Locale;
  /** Public path after the locale: '' for home, '/shop', '/products/essential-tee'. Never a currency segment. */
  path: string;
  /** Page title; the layout's title template adds the brand. */
  title: string;
  description: string;
  type?: 'website' | 'article';
  /** Use the title as is, without the layout's template (the home page carries its own full title). */
  absoluteTitle?: boolean;
  /** Keep the page out of the index but let crawlers follow its links (cart, search, checkout). */
  noindex?: boolean;
};

/**
 * Metadata for one page. Next.js shallow-merges `openGraph` per segment, so every field is set here
 * rather than inherited from a layout. Images are left out: routes add them with `withOgImage`
 * (src/components/og, ADR-0011). Open Graph and Twitter carry the plain title, since the template only
 * applies to <title>.
 */
export function pageMetadata(input: PageMetadataInput): PageMetadata {
  const { locale, path, title, description, type = 'website', absoluteTitle = false } = input;
  if (path !== '' && !path.startsWith('/')) {
    throw new RangeError(`pageMetadata needs a path starting with "/", received "${path}"`);
  }
  if (path.split('/').some((segment) => segmentToCurrency(segment) !== null)) {
    throw new RangeError(`pageMetadata needs a public path, received internal path "${path}"`);
  }
  const alternates = languageAlternates(locale, path);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates,
    openGraph: {
      type,
      siteName: BRAND_NAME,
      title,
      description,
      url: alternates.canonical,
      ...openGraphLocales(locale),
    },
    twitter: { card: 'summary_large_image', title, description },
    ...(input.noindex === true ? { robots: { index: false, follow: true } } : {}),
  };
}
