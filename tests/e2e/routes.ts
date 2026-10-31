import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { CATEGORY_ENTRIES } from '@/data/categories';
import { LOOKS } from '@/data/looks';
import { PRODUCTS } from '@/data/products';
import { VIBE_ENTRIES } from '@/data/vibes';

export const LOCALES = ['en', 'th'] as const;
export type Locale = (typeof LOCALES)[number];

// src/content/journal.ts pulls MDX modules, which Playwright cannot load. The article list is read from
// the content directory instead; the sitemap spec checks it against what the app really serves.
export function journalSlugs(): string[] {
  return readdirSync(join(process.cwd(), 'src/content/journal/en'))
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''))
    .sort();
}

/** Public path of the unknown-URL page; the 404 is part of the sweep (SPEC 4, 13a). */
export const NOT_FOUND_PATH = 'does-not-exist';

/** Every public path (no locale prefix, no currency segment), generated from the seed data. */
export function pathsWithoutLocale(): string[] {
  return [
    '',
    '/shop',
    ...CATEGORY_ENTRIES.map((category) => `/collections/${category.id}`),
    ...PRODUCTS.map((product) => `/products/${product.slug}`),
    '/looks',
    ...LOOKS.map((look) => `/looks/${look.slug}`),
    '/vibes',
    ...VIBE_ENTRIES.map((vibe) => `/vibes/${vibe.id}`),
    '/journal',
    ...journalSlugs().map((slug) => `/journal/${slug}`),
    '/search',
    '/cart',
    '/checkout',
    '/checkout/success',
    '/case-study',
    `/${NOT_FOUND_PATH}`,
  ];
}

/** Every route x locale, as public URLs. */
export function allRoutes(): string[] {
  return LOCALES.flatMap((locale) => pathsWithoutLocale().map((path) => `/${locale}${path}`));
}

/** Collection states that carry a query string: active chips and the empty state (T08). */
export const QUERY_STATE_ROUTES = [
  '/en/shop?color=black&size=M&minPrice=50&priceCurrency=usd&sort=price-asc',
  '/th/shop?category=accessories&size=XXL',
] as const;
