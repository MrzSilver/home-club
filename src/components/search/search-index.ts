import { PRODUCTS } from '@/data/products';
import { CATEGORY_ENTRIES } from '@/data/categories';
import type { Locale } from '@/data/schema';
import type { SearchEntry } from '@/lib/search';

export function getSearchIndex(locale: Locale): SearchEntry[] {
  return PRODUCTS.map((p) => ({
    slug: p.slug,
    name: p.name[locale],
    category: p.category,
    categoryName: CATEGORY_ENTRIES.find((c) => c.id === p.category)?.name[locale] ?? '',
    tags: p.tags,
  }));
}
