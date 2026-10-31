// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { LOCALE_COOKIE_MAX_AGE } from '@/i18n/routing';
import { config, proxy } from '@/proxy';

const ORIGIN = 'http://localhost:3000';

type Init = { cookie?: string; acceptLanguage?: string };

function request(path: string, { cookie, acceptLanguage }: Init = {}): NextRequest {
  const headers = new Headers();
  if (cookie !== undefined) headers.set('cookie', cookie);
  if (acceptLanguage !== undefined) headers.set('accept-language', acceptLanguage);
  return new NextRequest(`${ORIGIN}${path}`, { headers });
}

/** Where a rewrite sends the request (path + query), or null when the response is not a rewrite. */
function rewriteTarget(response: Response): string | null {
  const target = response.headers.get('x-middleware-rewrite');
  if (target === null) return null;
  const url = new URL(target);
  return `${url.pathname}${url.search}`;
}

function redirectTarget(response: Response): string | null {
  const location = response.headers.get('location');
  if (location === null) return null;
  const url = new URL(location, ORIGIN);
  return `${url.pathname}${url.search}`;
}

describe('proxy: currency rewrite (FR-072, ADR-0003)', () => {
  it('rewrites /en to the USD segment when there is no cookie', () => {
    const response = proxy(request('/en'));
    expect(response.status).toBe(200);
    expect(rewriteTarget(response)).toBe('/en/usd');
  });

  it('rewrites /th to the THB segment when there is no cookie', () => {
    expect(rewriteTarget(proxy(request('/th')))).toBe('/th/thb');
  });

  it('honours the hc_currency cookie over the locale default', () => {
    expect(rewriteTarget(proxy(request('/en', { cookie: 'hc_currency=THB' })))).toBe('/en/thb');
    expect(rewriteTarget(proxy(request('/th', { cookie: 'hc_currency=USD' })))).toBe('/th/usd');
  });

  it.each(['hc_currency=EUR', 'hc_currency=thb', 'hc_currency=', 'hc_currency=%00', 'other=THB'])(
    'ignores an invalid cookie (%s) and falls back to the locale default',
    (cookie) => {
      expect(rewriteTarget(proxy(request('/en', { cookie })))).toBe('/en/usd');
      expect(rewriteTarget(proxy(request('/th', { cookie })))).toBe('/th/thb');
    },
  );

  it('rewrites deeper paths and keeps the query string', () => {
    const response = proxy(request('/en/shop?color=black&size=M&priceCurrency=usd'));
    expect(rewriteTarget(response)).toBe('/en/usd/shop?color=black&size=M&priceCurrency=usd');
    const thai = proxy(
      request('/th/products/classic-cap?color=sand', { cookie: 'hc_currency=USD' }),
    );
    expect(rewriteTarget(thai)).toBe('/th/usd/products/classic-cap?color=sand');
  });

  it('keeps what next-intl set: the locale request header and the locale cookie', () => {
    const response = proxy(request('/th/shop'));
    expect(response.headers.get('x-middleware-request-x-next-intl-locale')).toBe('th');
    expect(response.headers.get('set-cookie')).toContain('NEXT_LOCALE=th');
    // The rewrite header replaced next-intl's pass-through marker.
    expect(response.headers.get('x-middleware-next')).toBeNull();
  });

  it('keeps the locale choice for a year (FR-002): a persistent, site-wide, SameSite=Lax cookie', () => {
    const cookie = proxy(request('/th/shop')).headers.get('set-cookie') ?? '';
    expect(cookie).toContain('NEXT_LOCALE=th');
    expect(cookie).toContain('Path=/');
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toContain(`Max-Age=${LOCALE_COOKIE_MAX_AGE}`);
    expect(LOCALE_COOKIE_MAX_AGE).toBe(31_536_000);
    // Not a session cookie: it also has an absolute expiry about a year away.
    const expires = /Expires=([^;]+)/i.exec(cookie)?.[1];
    expect(expires).toBeDefined();
    const days = (Date.parse(expires ?? '') - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(360);
    expect(days).toBeLessThan(366);
  });

  it('forwards the original request headers (cookie included) to the rewritten request', () => {
    const response = proxy(request('/en', { cookie: 'hc_currency=THB' }));
    expect(response.headers.get('x-middleware-request-cookie')).toContain('hc_currency=THB');
  });
});

describe('proxy: internal paths are not public (FR-071, ADR-0003)', () => {
  it.each([
    ['/en/usd', '/en'],
    ['/en/thb', '/en'],
    ['/th/thb/shop', '/th/shop'],
    ['/th/usd/products/classic-cap', '/th/products/classic-cap'],
  ])('redirects %s to %s with a 308', (from, to) => {
    const response = proxy(request(from));
    expect(response.status).toBe(308);
    expect(redirectTarget(response)).toBe(to);
  });

  it('keeps the query string on that redirect', () => {
    const response = proxy(request('/en/thb/shop?sort=newest'));
    expect(redirectTarget(response)).toBe('/en/shop?sort=newest');
  });

  it('does not change the currency cookie when redirecting', () => {
    const response = proxy(request('/en/thb/shop', { cookie: 'hc_currency=USD' }));
    expect(response.headers.get('set-cookie') ?? '').not.toContain('hc_currency');
  });
});

describe('proxy: locale redirects from next-intl (FR-071)', () => {
  it('redirects / to /en by default', () => {
    const response = proxy(request('/'));
    expect(response.status).toBe(307);
    expect(redirectTarget(response)).toBe('/en');
  });

  it('redirects / to /th when Accept-Language prefers Thai', () => {
    const response = proxy(request('/', { acceptLanguage: 'th-TH,th;q=0.9,en;q=0.5' }));
    expect(redirectTarget(response)).toBe('/th');
  });

  it('prefers the NEXT_LOCALE cookie over Accept-Language', () => {
    const response = proxy(request('/', { cookie: 'NEXT_LOCALE=th', acceptLanguage: 'en-US' }));
    expect(redirectTarget(response)).toBe('/th');
    const other = proxy(request('/', { cookie: 'NEXT_LOCALE=en', acceptLanguage: 'th' }));
    expect(redirectTarget(other)).toBe('/en');
  });

  it('falls back to the default locale for languages the site does not offer', () => {
    expect(redirectTarget(proxy(request('/', { acceptLanguage: 'fr-FR,fr;q=0.9' })))).toBe('/en');
  });

  it('adds the locale prefix to a prefix-less path and keeps the query', () => {
    const response = proxy(request('/shop?color=black', { acceptLanguage: 'th' }));
    expect(redirectTarget(response)).toBe('/th/shop?color=black');
  });

  it('does not rewrite when next-intl redirects', () => {
    expect(proxy(request('/')).headers.get('x-middleware-rewrite')).toBeNull();
  });
});

describe('proxy: malformed URLs', () => {
  it('leaves a malformed URI to Next.js (which answers 500 itself) instead of rewriting it', () => {
    const response = proxy(request('/en/%E0%A4%A'));
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    expect(response.headers.get('location')).toBeNull();
  });
});

describe('proxy matcher', () => {
  const matcher = config.matcher[0] ?? '';
  // Next.js compiles matchers with path-to-regexp; this anchors the same expression for a quick check.
  const matches = (pathname: string): boolean => new RegExp(`^${matcher}$`).test(pathname);

  it.each([
    '/',
    '/en',
    '/th',
    '/en/shop',
    '/th/products/essential-tee',
    '/shop',
    '/images-and-more',
  ])('runs for the page path %s', (pathname) => {
    expect(matches(pathname)).toBe(true);
  });

  it.each([
    '/_next/static/chunks/main.js',
    '/_next/image',
    '/api',
    '/api/health',
    '/images/products/essential-tee/sand-1.webp',
    '/images',
    '/icon.svg',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.webmanifest',
    '/en/opengraph-image.png',
    '/en/og/home.png',
    '/th/og/products/essential-tee/image.png',
    '/en/og/journal/care-for-basics/image.png',
    '/_vercel/insights/script.js',
  ])('is skipped for %s', (pathname) => {
    expect(matches(pathname)).toBe(false);
  });
});
