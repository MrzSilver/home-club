import { describe, expect, it } from 'vitest';

import { absoluteUrl, openGraphLocales } from '@/lib/seo';

describe('openGraphLocales (FR-071)', () => {
  it('writes English as en_US and lists Thai as the alternate', () => {
    expect(openGraphLocales('en')).toEqual({ locale: 'en_US', alternateLocale: ['th_TH'] });
  });

  it('writes Thai as th_TH and lists English as the alternate', () => {
    expect(openGraphLocales('th')).toEqual({ locale: 'th_TH', alternateLocale: ['en_US'] });
  });
});

describe('absoluteUrl (FR-071, SEO NFR)', () => {
  const site = 'https://homeclub.example';

  it.each([
    ['/en', 'https://homeclub.example/en'],
    ['/th/shop', 'https://homeclub.example/th/shop'],
    ['/en/products/essential-tee', 'https://homeclub.example/en/products/essential-tee'],
    ['/images/brand/hero-1.webp', 'https://homeclub.example/images/brand/hero-1.webp'],
  ])('resolves the public path %s against the site origin', (path, expected) => {
    expect(absoluteUrl(path, site)).toBe(expected);
  });

  it('ignores a trailing slash on the site origin', () => {
    expect(absoluteUrl('/en/shop', `${site}/`)).toBe('https://homeclub.example/en/shop');
  });

  it('defaults to NEXT_PUBLIC_SITE_URL from the validated environment', () => {
    expect(absoluteUrl('/en')).toMatch(/^https?:\/\/.+\/en$/);
  });

  it.each(['/en/usd/shop', '/th/thb', '/en/thb/products/essential-tee', '/usd/shop'])(
    'refuses the internal path %s so the currency segment never leaks',
    (path) => {
      expect(() => absoluteUrl(path, site)).toThrow(RangeError);
    },
  );

  it.each(['en/shop', '//evil.example/en', 'https://evil.example/en', ''])(
    'refuses %j, which is not a root-relative path',
    (path) => {
      expect(() => absoluteUrl(path, site)).toThrow(RangeError);
    },
  );

  it('allows a currency word in a query string, which is not a path segment', () => {
    expect(absoluteUrl('/en/shop?currency=usd', site)).toBe(
      'https://homeclub.example/en/shop?currency=usd',
    );
  });
});
