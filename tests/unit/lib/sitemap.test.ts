import { describe, expect, it } from 'vitest';

import { LOCALES } from '@/data/locales';
import { LOOKS } from '@/data/looks';
import { PRODUCTS } from '@/data/products';
import { VIBE_ENTRIES } from '@/data/vibes';
import { sitemapEntries, type SitemapArticle } from '@/lib/sitemap';

const SITE = 'https://homeclub.example';
const ARTICLES: readonly SitemapArticle[] = [
  { slug: 'everyday-layers', locales: ['en', 'th'] },
  { slug: 'care-for-basics', locales: ['en', 'th'] },
  { slug: 'one-set-many-days', locales: ['en', 'th'] },
];

// Home, shop, looks index, vibes index, journal index, case study, then the 4 collections.
const FIXED_ROUTES = 6 + 4;

describe('sitemapEntries (SEO NFR, FR-071)', () => {
  const entries = sitemapEntries(ARTICLES, SITE);

  it('lists every indexable route in every locale: locales x routes', () => {
    const routes =
      FIXED_ROUTES + PRODUCTS.length + LOOKS.length + VIBE_ENTRIES.length + ARTICLES.length;
    expect(entries).toHaveLength(LOCALES.length * routes);
  });

  it('lists each URL exactly once', () => {
    const urls = entries.map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('includes the pages the plan names', () => {
    const urls = new Set(entries.map((entry) => entry.url));
    for (const locale of LOCALES) {
      for (const rest of [
        '',
        '/shop',
        '/looks',
        '/vibes',
        '/journal',
        '/collections/foundations',
        '/collections/accessories',
        '/journal/care-for-basics',
      ]) {
        expect(urls.has(`${SITE}/${locale}${rest}`)).toBe(true);
      }
    }
    for (const product of PRODUCTS) {
      expect(urls.has(`${SITE}/th/products/${product.slug}`)).toBe(true);
    }
    for (const look of LOOKS) expect(urls.has(`${SITE}/en/looks/${look.slug}`)).toBe(true);
    for (const vibe of VIBE_ENTRIES) expect(urls.has(`${SITE}/en/vibes/${vibe.id}`)).toBe(true);
  });

  it('lists the case study in both locales (FR-062)', () => {
    const urls = new Set(entries.map((entry) => entry.url));
    expect(urls.has(`${SITE}/en/case-study`)).toBe(true);
    expect(urls.has(`${SITE}/th/case-study`)).toBe(true);
  });

  it.each(['/cart', '/checkout', '/checkout/success', '/search'])('leaves out %s', (rest) => {
    expect(entries.some((entry) => entry.url.includes(rest))).toBe(false);
  });

  it('uses absolute public URLs with no currency segment', () => {
    for (const entry of entries) {
      expect(entry.url.startsWith(`${SITE}/`)).toBe(true);
      expect(entry.url).not.toMatch(/\/(usd|thb)(\/|$)/);
      for (const alternate of Object.values(entry.alternates.languages)) {
        expect(alternate.startsWith(`${SITE}/`)).toBe(true);
        expect(alternate).not.toMatch(/\/(usd|thb)(\/|$)/);
      }
    }
  });

  it('gives each entry en, th and x-default alternates that include itself', () => {
    for (const entry of entries) {
      const { languages } = entry.alternates;
      expect(Object.keys(languages).sort()).toEqual(['en', 'th', 'x-default']);
      expect(Object.values(languages)).toContain(entry.url);
      expect(languages['x-default']).toBe(languages.en);
      expect(languages.en?.replace('/en', '/th')).toBe(languages.th);
    }
  });

  it('only lists an article in the locales it exists in, with matching alternates', () => {
    const matches = sitemapEntries([{ slug: 'only-english', locales: ['en'] }], SITE).filter(
      (entry) => entry.url.includes('/journal/only-english'),
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.url).toBe(`${SITE}/en/journal/only-english`);
    expect(matches[0]?.alternates.languages).toEqual({
      en: `${SITE}/en/journal/only-english`,
      'x-default': `${SITE}/en/journal/only-english`,
    });
  });

  it('points x-default at the first available language when English is missing', () => {
    const [entry] = sitemapEntries([{ slug: 'thai-only', locales: ['th'] }], SITE).filter((e) =>
      e.url.includes('/journal/thai-only'),
    );
    expect(entry?.alternates.languages['x-default']).toBe(`${SITE}/th/journal/thai-only`);
  });

  it('uses NEXT_PUBLIC_SITE_URL when no origin is passed', () => {
    const [first] = sitemapEntries([]);
    expect(first?.url).toMatch(/^https?:\/\/.+\/en$/);
  });
});
