// No Zod here: this module is reachable from client code (via lib/locale-path and the i18n
// navigation wrapper), and Zod must stay out of the browser bundle (it probes Function(""), which the
// CSP reports). Membership in a const tuple is the whole validation these three values need.
import type { Locale } from '@/data/schema';
import type { Currency } from '@/lib/money';

// Cookie that carries the visitor's currency choice (SPEC 6). The proxy reads it and rewrites the
// public URL to the hidden `[currency]` route segment (owner decision 8).
export const CURRENCY_COOKIE = 'hc_currency';

export const CURRENCIES = ['USD', 'THB'] as const satisfies readonly Currency[];

// Lowercase form used for the internal route segment: /en/usd/shop, /th/thb/shop.
export const CURRENCY_SEGMENTS = ['usd', 'thb'] as const;
export type CurrencySegment = (typeof CURRENCY_SEGMENTS)[number];

/** Validates untrusted input (cookie, storage) and returns the currency, or null when invalid. */
export function parseCurrency(value: unknown): Currency | null {
  return CURRENCIES.find((currency) => currency === value) ?? null;
}

/** en -> USD, th -> THB (SPEC 6). */
export function defaultCurrencyFor(locale: Locale): Currency {
  return locale === 'th' ? 'THB' : 'USD';
}

export function currencyToSegment(currency: Currency): CurrencySegment {
  return currency === 'THB' ? 'thb' : 'usd';
}

/** Parses the hidden route segment; null for anything that is not `usd` or `thb`. */
export function segmentToCurrency(segment: unknown): Currency | null {
  const match = CURRENCY_SEGMENTS.find((candidate) => candidate === segment);
  if (match === undefined) return null;
  return match === 'thb' ? 'THB' : 'USD';
}

/** The cookie value when valid, otherwise the locale default. */
export function resolveCurrency(cookieValue: unknown, locale: Locale): Currency {
  return parseCurrency(cookieValue) ?? defaultCurrencyFor(locale);
}

/** One year, in seconds: the currency choice is a preference, not a session. */
export const CURRENCY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Value for `document.cookie` that stores the visitor's currency (SPEC 6). Not personal data; not
 * HttpOnly because the switcher writes it from the browser. `Secure` is only added over https, so
 * local `next start` over http keeps working.
 */
export function buildCurrencyCookie(
  currency: Currency,
  options: { secure?: boolean } = {},
): string {
  const parts = [
    `${CURRENCY_COOKIE}=${currency}`,
    'Path=/',
    `Max-Age=${CURRENCY_COOKIE_MAX_AGE}`,
    'SameSite=Lax',
  ];
  if (options.secure === true) parts.push('Secure');
  return parts.join('; ');
}

/**
 * The currency stored in a `document.cookie` string, or null when absent or invalid. The cookie is
 * untrusted input like any other, so the value goes through `parseCurrency`.
 */
export function readCurrencyCookie(cookieString: string): Currency | null {
  for (const part of cookieString.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === CURRENCY_COOKIE) return parseCurrency(rest.join('='));
  }
  return null;
}
