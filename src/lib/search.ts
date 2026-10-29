import type { Locale, Product } from '@/data/schema';

export type SearchEntry = Pick<Product, 'slug' | 'category' | 'tags'> & {
  name: string;
  categoryName: string;
};
export function searchProducts(
  entries: readonly SearchEntry[],
  query: string,
  locale: Locale,
): SearchEntry[] {
  const terms = query.trim().toLocaleLowerCase(locale).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return entries.filter((entry) => {
    const text = `${entry.name} ${entry.categoryName} ${entry.tags.join(' ')}`
      .normalize('NFKC')
      .toLocaleLowerCase(locale);
    return terms.every((term) => text.includes(term.normalize('NFKC')));
  });
}
