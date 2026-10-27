import { describe, expect, it } from 'vitest';

import { categoryLinks, primaryLinks } from '@/components/layout/nav-links';
import { CATEGORY_ENTRIES } from '@/data/categories';

describe('menu and footer links (FR-001, FR-003)', () => {
  it('starts with Home and Shop all, as public paths', () => {
    expect(primaryLinks({ home: 'Home', shopAll: 'Shop all' })).toEqual([
      { href: '/', label: 'Home' },
      { href: '/shop', label: 'Shop all' },
    ]);
  });

  it('lists every catalogue category once, in catalogue order, with no locale or currency in the path', () => {
    const links = categoryLinks('en');

    expect(links.map((link) => link.href)).toEqual(
      CATEGORY_ENTRIES.map((category) => `/collections/${category.id}`),
    );
    expect(links.map((link) => link.href).join()).not.toMatch(/\/(en|th|usd|thb)\b/);
    expect(new Set(links.map((link) => link.href)).size).toBe(4);
  });

  it('names the categories in the requested language', () => {
    expect(categoryLinks('en').map((link) => link.label)).toContain('Foundations');
    expect(categoryLinks('th').map((link) => link.label)).toContain('ไอเท็มพื้นฐาน');
  });
});
