import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOCALE,
  internalPath,
  isLocale,
  languageAlternates,
  parseInternalPath,
  publicPath,
  splitLocalePath,
  stripCurrencySegment,
  toPublicPath,
} from '@/lib/locale-path';

describe('locale path helpers (FR-071, hidden currency segment)', () => {
  it('knows the supported locales and the default', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect(isLocale('en')).toBe(true);
    expect(isLocale('th')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale('EN')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it.each([
    ['/en', { locale: 'en', rest: '' }],
    ['/th/shop', { locale: 'th', rest: '/shop' }],
    ['/en/products/essential-tee', { locale: 'en', rest: '/products/essential-tee' }],
    ['/en/', { locale: 'en', rest: '/' }],
  ])('splits %s into locale and rest', (pathname, expected) => {
    expect(splitLocalePath(pathname)).toEqual(expected);
  });

  it.each(['/', '', '/fr/shop', '/shop', '/images/a.webp', '/english'])(
    'returns null for %s (no locale prefix)',
    (pathname) => {
      expect(splitLocalePath(pathname)).toBeNull();
    },
  );

  it.each([
    ['/en/usd', { locale: 'en', currency: 'USD', rest: '' }],
    ['/th/thb', { locale: 'th', currency: 'THB', rest: '' }],
    ['/en/thb/shop', { locale: 'en', currency: 'THB', rest: '/shop' }],
    ['/th/usd/products/x', { locale: 'th', currency: 'USD', rest: '/products/x' }],
  ])('recognises the internal path %s', (pathname, expected) => {
    expect(parseInternalPath(pathname)).toEqual(expected);
  });

  it.each(['/en', '/en/shop', '/en/usdx', '/en/USD', '/en/shop/usd', '/usd/shop', '/fr/usd', '/'])(
    'does not treat %s as an internal path',
    (pathname) => {
      expect(parseInternalPath(pathname)).toBeNull();
    },
  );

  it('builds public and internal paths', () => {
    expect(publicPath('en')).toBe('/en');
    expect(publicPath('th', '/shop')).toBe('/th/shop');
    expect(internalPath('en', 'USD')).toBe('/en/usd');
    expect(internalPath('th', 'THB', '/shop')).toBe('/th/thb/shop');
  });

  it('maps internal paths back to public paths', () => {
    expect(toPublicPath('/en/usd')).toBe('/en');
    expect(toPublicPath('/th/thb/shop')).toBe('/th/shop');
    expect(toPublicPath('/en/shop')).toBeNull();
  });

  it('round-trips internal -> public -> internal for both currencies', () => {
    for (const path of ['/en', '/th', '/en/shop', '/th/products/classic-cap']) {
      for (const currency of ['USD', 'THB'] as const) {
        const split = splitLocalePath(path);
        expect(split).not.toBeNull();
        const internal = internalPath(split?.locale ?? 'en', currency, split?.rest);
        expect(toPublicPath(internal)).toBe(path);
        expect(parseInternalPath(internal)).toMatchObject({ currency });
      }
    }
  });

  it('builds canonical and hreflang alternates from public paths only (FR-071)', () => {
    expect(languageAlternates('th')).toEqual({
      canonical: '/th',
      languages: { en: '/en', th: '/th', 'x-default': '/en' },
    });
    expect(languageAlternates('en', '/shop')).toEqual({
      canonical: '/en/shop',
      languages: { en: '/en/shop', th: '/th/shop', 'x-default': '/en/shop' },
    });
    const everything = JSON.stringify(languageAlternates('th', '/shop'));
    expect(everything).not.toMatch(/usd|thb/);
  });
});

describe('stripCurrencySegment (usePathname on a rewritten prerendered page)', () => {
  it.each([
    ['/usd/shop', '/shop'],
    ['/thb/products/essential-tee', '/products/essential-tee'],
    ['/usd', '/'],
    ['/thb', '/'],
    ['/usd/', '/'],
    ['/shop', '/shop'],
    ['/', '/'],
    ['', ''],
    ['/usdx', '/usdx'],
    ['/usd-x/shop', '/usd-x/shop'],
    ['/shop/usd', '/shop/usd'],
    ['/USD/shop', '/USD/shop'],
  ])('maps %s to %s', (pathname, expected) => {
    expect(stripCurrencySegment(pathname)).toBe(expected);
  });

  it('agrees with the public path whatever the server rewrote it to', () => {
    for (const rest of ['', '/shop', '/products/essential-tee']) {
      const publicRest = rest === '' ? '/' : rest;
      for (const currency of ['usd', 'thb']) {
        expect(stripCurrencySegment(`/${currency}${rest}`)).toBe(publicRest);
      }
    }
  });
});
