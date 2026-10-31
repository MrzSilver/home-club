import { CATEGORY_ENTRIES } from '@/data/categories';
import { LOCALES } from '@/data/locales';
import { LOOKS } from '@/data/looks';
import { PRODUCTS } from '@/data/products';
import type { Locale } from '@/data/schema';
import { VIBE_ENTRIES } from '@/data/vibes';
import { DEFAULT_LOCALE, languageAlternates, publicPath } from '@/lib/locale-path';
import { absoluteUrl } from '@/lib/seo';

// The indexable public pages (PRD SEO NFR). Not listed on purpose: /cart, /checkout, /checkout/success
// and /search (all noindex). Add a route here (one line) when a new indexable page ships.
const STATIC_ROUTES: readonly string[] = ['', '/shop', '/looks', '/vibes', '/journal'];

/** An article and the languages it is published in. The MDX files live on disk, so the caller lists them. */
export type SitemapArticle = { slug: string; locales: readonly Locale[] };

/** Assignable to one element of Next.js's `MetadataRoute.Sitemap`. */
export type SitemapEntry = {
  url: string;
  alternates: { languages: Partial<Record<Locale | 'x-default', string>> };
};

type Route = { rest: string; locales: readonly Locale[] };

function sitemapRoutes(articles: readonly SitemapArticle[]): Route[] {
  const everywhere = (rest: string): Route => ({ rest, locales: LOCALES });
  return [
    ...STATIC_ROUTES.map(everywhere),
    ...CATEGORY_ENTRIES.map((category) => everywhere(`/collections/${category.id}`)),
    ...PRODUCTS.map((product) => everywhere(`/products/${product.slug}`)),
    ...LOOKS.map((look) => everywhere(`/looks/${look.slug}`)),
    ...VIBE_ENTRIES.map((vibe) => everywhere(`/vibes/${vibe.id}`)),
    ...articles.map((article) => ({ rest: `/journal/${article.slug}`, locales: article.locales })),
  ];
}

function entryFor(route: Route, locale: Locale, siteUrl: string | undefined): SitemapEntry {
  const paths = languageAlternates(locale, route.rest).languages;
  const languages: SitemapEntry['alternates']['languages'] = {};
  for (const available of route.locales) {
    languages[available] = absoluteUrl(paths[available], siteUrl);
  }
  // x-default is the default locale's page; for a page without it, the first language it has.
  const fallback = route.locales.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : route.locales[0];
  if (fallback !== undefined) languages['x-default'] = absoluteUrl(paths[fallback], siteUrl);
  return { url: absoluteUrl(publicPath(locale, route.rest), siteUrl), alternates: { languages } };
}

/**
 * One entry per indexable route and language, each listing its language alternates and `x-default`.
 * `articles` is injected because reading the MDX directory is I/O, which `lib/` must not do.
 */
export function sitemapEntries(
  articles: readonly SitemapArticle[],
  siteUrl?: string,
): SitemapEntry[] {
  return sitemapRoutes(articles).flatMap((route) =>
    route.locales.map((locale) => entryFor(route, locale, siteUrl)),
  );
}
