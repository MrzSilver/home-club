import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PREFETCH, prefetchFor, type PrefetchRoute } from '@/components/catalogue/prefetch';

const ROUTES_DIR = join(process.cwd(), 'src', 'app', '[locale]', '[currency]');

// The page a link into each route lands on. `collections` has no index page: its links always name a
// category, so the page that must exist is the category page.
const PAGE_FILE: Record<PrefetchRoute, string> = {
  shop: join('shop', 'page.tsx'),
  collections: join('collections', '[category]', 'page.tsx'),
  products: join('products', '[slug]', 'page.tsx'),
  cart: join('cart', 'page.tsx'),
};

describe('catalogue link prefetch switches', () => {
  // Prefetching a URL with no page logs a 404 on every visit; leaving a switch off after its page
  // exists silently loses prefetching. Each switch must therefore equal "the route file exists".
  const routes = Object.keys(PREFETCH) as PrefetchRoute[];

  it.each(routes)('"%s" is on exactly when its page file exists', (route) => {
    const exists = existsSync(join(ROUTES_DIR, PAGE_FILE[route]));
    expect(prefetchFor(route)).toBe(exists);
  });

  it('covers every route Home and the catalogue link into', () => {
    expect(routes.toSorted()).toEqual(['cart', 'collections', 'products', 'shop']);
  });
});
