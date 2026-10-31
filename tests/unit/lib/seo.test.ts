import type { Metadata } from 'next';
import { describe, expect, it } from 'vitest';

import { absoluteUrl, openGraphLocales, pageMetadata } from '@/lib/seo';

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

describe('pageMetadata (FR-071, SEO NFR)', () => {
  const base = { title: 'Shop', description: 'All products.' };

  it.each([
    ['en', '', '/en', '/th'],
    ['th', '/shop', '/th/shop', '/en/shop'],
    ['en', '/products/essential-tee', '/en/products/essential-tee', '/th/products/essential-tee'],
    ['th', '/products/essential-tee', '/th/products/essential-tee', '/en/products/essential-tee'],
  ] as const)('builds canonical and hreflang for %s %j', (locale, path, canonical, other) => {
    const meta = pageMetadata({ ...base, locale, path });
    expect(meta.alternates?.canonical).toBe(canonical);
    const languages = meta.alternates?.languages as Record<string, string>;
    expect(languages['x-default']).toBe(`/en${path}`);
    expect(locale === 'en' ? languages['th'] : languages['en']).toBe(other);
    expect(meta.openGraph?.url).toBe(canonical);
  });

  it('sets the Open Graph locale and its alternate for Thai and English', () => {
    expect(pageMetadata({ ...base, locale: 'th', path: '/shop' }).openGraph).toMatchObject({
      locale: 'th_TH',
      alternateLocale: ['en_US'],
      siteName: 'Home Club Foundation',
      type: 'website',
      title: 'Shop',
      description: 'All products.',
    });
    expect(pageMetadata({ ...base, locale: 'en', path: '/shop' }).openGraph).toMatchObject({
      locale: 'en_US',
      alternateLocale: ['th_TH'],
    });
  });

  it('marks articles as Open Graph type article', () => {
    const meta = pageMetadata({ ...base, locale: 'en', path: '/journal/x', type: 'article' });
    expect(meta.openGraph).toMatchObject({ type: 'article' });
  });

  it('keeps a plain title under the layout template and indexable by default', () => {
    const meta = pageMetadata({ ...base, locale: 'en', path: '/shop' });
    expect(meta.title).toBe('Shop');
    expect(meta.robots).toBeUndefined();
  });

  it('uses an absolute title without changing the Open Graph and Twitter title', () => {
    const meta = pageMetadata({ ...base, locale: 'en', path: '', absoluteTitle: true });
    expect(meta.title).toEqual({ absolute: 'Shop' });
    expect(meta.openGraph).toMatchObject({ title: 'Shop' });
    expect(meta.twitter).toMatchObject({ title: 'Shop' });
  });

  it('emits noindex,follow robots when asked', () => {
    const meta = pageMetadata({ ...base, locale: 'en', path: '/cart', noindex: true });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it('uses the large summary Twitter card', () => {
    expect(pageMetadata({ ...base, locale: 'en', path: '/shop' }).twitter).toEqual({
      card: 'summary_large_image',
      title: 'Shop',
      description: 'All products.',
    });
  });

  it('never exposes the currency segment in the result', () => {
    const json = JSON.stringify(pageMetadata({ ...base, locale: 'th', path: '/products/x' }));
    expect(json).not.toMatch(/\/(usd|thb)(\/|")/);
  });

  it.each(['/usd/shop', '/thb', '/products/usd'])('throws on the internal path %s', (path) => {
    expect(() => pageMetadata({ ...base, locale: 'en', path })).toThrow(RangeError);
  });

  it('throws on a non-empty path without a leading slash', () => {
    expect(() => pageMetadata({ ...base, locale: 'en', path: 'shop' })).toThrow(RangeError);
  });
});

describe('pageMetadata type contract (FR-071)', () => {
  it('is assignable to the Next.js Metadata type', () => {
    const meta: Metadata = pageMetadata({
      locale: 'en',
      path: '/shop',
      title: 'a',
      description: 'b',
    });
    expect(meta.title).toBe('a');
  });
});
