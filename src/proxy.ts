import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import { routing } from '@/i18n/routing';
import { CURRENCY_COOKIE, resolveCurrency } from '@/lib/currency';
import { internalPath, splitLocalePath, toPublicPath } from '@/lib/locale-path';

// Proxy (Next.js 16's middleware) for locale routing and the hidden currency segment
// (docs/adr/0003-currency-segment.md, docs/adr/0002-csp.md).
//
//   1. next-intl decides the locale: `/` and prefix-less paths redirect to `/{locale}/...`.
//   2. A request for an internal path (`/en/usd/shop`) is redirected to its public form (`/en/shop`).
//      The cookie is NOT touched: a GET redirect should not change state, and the internal segment
//      is not a URL anybody is meant to share.
//   3. Everything else is REWRITTEN to `/{locale}/{usd|thb}/...` using the `hc_currency` cookie
//      (default: en -> USD, th -> THB). The browser URL does not change and every page stays static.

const intlMiddleware = createIntlMiddleware(routing);

/** Request headers next-intl overrides travel as `x-middleware-request-*` response headers. */
const OVERRIDE_PREFIX = 'x-middleware-request-';

function isRedirect(response: NextResponse): boolean {
  return response.headers.has('location');
}

function isDecodable(pathname: string): boolean {
  try {
    decodeURIComponent(pathname);
    return true;
  } catch {
    return false;
  }
}

/**
 * Rewrites to `target` while keeping what next-intl put on its response: the locale request
 * header, the NEXT_LOCALE cookie and the alternate-links `Link` header.
 */
function rewriteKeeping(
  request: NextRequest,
  intlResponse: NextResponse,
  target: URL,
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  for (const [name, value] of intlResponse.headers) {
    if (name.startsWith(OVERRIDE_PREFIX))
      requestHeaders.set(name.slice(OVERRIDE_PREFIX.length), value);
  }
  const response = NextResponse.rewrite(target, { request: { headers: requestHeaders } });
  for (const [name, value] of intlResponse.headers) {
    if (!name.startsWith('x-middleware-')) response.headers.append(name, value);
  }
  return response;
}

export function proxy(request: NextRequest): NextResponse {
  const intlResponse = intlMiddleware(request);
  if (isRedirect(intlResponse)) return intlResponse;

  const { pathname } = request.nextUrl;

  // A path that does not percent-decode is left alone: Next.js itself answers it with a plain 500
  // (also for paths this proxy skips, such as /images/%E0%A4%A), and rewriting it would only move
  // that error to a different URL.
  if (!isDecodable(pathname)) return intlResponse;

  const publicPathname = toPublicPath(pathname);
  if (publicPathname !== null) {
    const publicUrl = request.nextUrl.clone();
    publicUrl.pathname = publicPathname;
    return NextResponse.redirect(publicUrl, 308);
  }

  // next-intl redirects every prefix-less path, so this is only a type-narrowing guard.
  const split = splitLocalePath(pathname);
  if (split === null) return intlResponse;

  const currency = resolveCurrency(request.cookies.get(CURRENCY_COOKIE)?.value, split.locale);
  const target = request.nextUrl.clone();
  target.pathname = internalPath(split.locale, currency, split.rest);
  return rewriteKeeping(request, intlResponse, target);
}

// Skipped: Next.js internals, API routes, static files (anything with a file extension, which covers
// icon.svg, favicon.ico, robots.txt, sitemap.xml, manifest.webmanifest and fonts) and /images.
// Keep this a literal: Next.js analyses it at build time.
export const config = {
  matcher: ['/((?!(?:api|_next|_vercel|images)(?:/|$)|.*\\..*).*)'],
};
