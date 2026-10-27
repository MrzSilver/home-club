import { LOCALES } from '@/data/locales';
import type { Locale } from '@/data/schema';
import { currencyToSegment, segmentToCurrency, type CurrencySegment } from '@/lib/currency';
import type { Currency } from '@/lib/money';

// Path logic for the hidden currency segment (docs/adr/0003-currency-segment.md).
//
//   public (what visitors see and share)   /en/shop
//   internal (what the router renders)     /en/usd/shop
//
// Pure string functions only, so the proxy, metadata builders and tests share one definition.

export type InternalPath = {
  locale: Locale;
  currency: Currency;
  /** Path after the currency segment: "" for the home page, otherwise "/shop", "/products/x" ... */
  rest: string;
};

/** Locale served at `/` for visitors with no preference, and used for `x-default`. */
export const DEFAULT_LOCALE: Locale = 'en';

const LOCALE_SET: ReadonlySet<string> = new Set(LOCALES);

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALE_SET.has(value);
}

/** "/en/shop/x" -> { locale: "en", rest: "/shop/x" }; "/en" -> rest ""; anything else -> null. */
export function splitLocalePath(pathname: string): { locale: Locale; rest: string } | null {
  const [, first = '', ...others] = pathname.split('/');
  if (!isLocale(first)) return null;
  return { locale: first, rest: others.length > 0 ? `/${others.join('/')}` : '' };
}

/** Recognises an internal path (`/{locale}/{usd|thb}[/...]`); null for public paths. */
export function parseInternalPath(pathname: string): InternalPath | null {
  const split = splitLocalePath(pathname);
  if (split === null) return null;
  const [, segment = '', ...others] = split.rest.split('/');
  const currency = segmentToCurrency(segment);
  if (currency === null) return null;
  return {
    locale: split.locale,
    currency,
    rest: others.length > 0 ? `/${others.join('/')}` : '',
  };
}

/** Public path for a locale and a path below it ("" is the home page): `/en`, `/th/shop`. */
export function publicPath(locale: Locale, rest = ''): string {
  return `/${locale}${rest}`;
}

/** Internal path for a locale, currency and path below it: `/en/usd`, `/th/thb/shop`. */
export function internalPath(locale: Locale, currency: Currency, rest = ''): string {
  const segment: CurrencySegment = currencyToSegment(currency);
  return `/${locale}/${segment}${rest}`;
}

/** Internal path -> public path (`/en/usd/shop` -> `/en/shop`); null for a path that is not internal. */
export function toPublicPath(pathname: string): string | null {
  const internal = parseInternalPath(pathname);
  return internal === null ? null : publicPath(internal.locale, internal.rest);
}

/**
 * Removes the hidden currency segment from a locale-less pathname, as next-intl's `usePathname` reports it.
 * On a prerendered page that went through the proxy rewrite, the server renders `/usd/shop` while the
 * browser (whose address bar holds the public URL) reports `/shop`; stripping the segment makes both agree.
 * `/usd/shop` -> `/shop`, `/usd` -> `/`, `/usdx` and `/shop/usd` are unchanged.
 */
export function stripCurrencySegment(pathname: string): string {
  const [, first = '', ...others] = pathname.split('/');
  if (segmentToCurrency(first) === null) return pathname;
  return others.length > 0 ? `/${others.join('/')}` : '/';
}

export type LanguageAlternates = {
  canonical: string;
  languages: Record<Locale | 'x-default', string>;
};

/**
 * Canonical and hreflang paths for one page (SPEC 4). Public paths only: the currency segment never
 * appears in metadata. Next.js resolves them against `metadataBase`. `x-default` is the default
 * locale. `rest` is the path below the locale ("" for the home page).
 */
export function languageAlternates(locale: Locale, rest = ''): LanguageAlternates {
  return {
    canonical: publicPath(locale, rest),
    languages: {
      en: publicPath('en', rest),
      th: publicPath('th', rest),
      'x-default': publicPath(DEFAULT_LOCALE, rest),
    },
  };
}
