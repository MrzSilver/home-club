import { describe, expect, it } from 'vitest';
import { searchProducts } from '@/lib/search';
import { parseSearchQuery } from '@/lib/search-query';

const entries = [
  {
    slug: 'tee',
    name: 'Essential Tee',
    category: 'foundations' as const,
    categoryName: 'Foundations',
    tags: ['cotton', 'daily'],
  },
  {
    slug: 'thai',
    name: 'เสื้อยืดพื้นฐาน',
    category: 'foundations' as const,
    categoryName: 'พื้นฐาน',
    tags: ['cotton'],
  },
];
describe('active locale search (FR-023)', () => {
  it('bounds untrusted URL queries with the schema', () => {
    expect(parseSearchQuery('tee')).toBe('tee');
    for (const value of [null, {}, 1, 'x'.repeat(201)]) expect(parseSearchQuery(value)).toBe('');
  });
  it('matches all words across name, category and tags regardless of case', () => {
    expect(searchProducts(entries, '  TEE cotton ', 'en').map((p) => p.slug)).toEqual(['tee']);
    expect(searchProducts(entries, 'พื้นฐาน', 'th').map((p) => p.slug)).toEqual(['thai']);
    expect(searchProducts(entries, 'Foundations', 'en').map((p) => p.slug)).toEqual(['tee']);
    expect(searchProducts(entries, '', 'en')).toEqual([]);
    expect(searchProducts(entries, 'unknown', 'th')).toEqual([]);
  });
});
