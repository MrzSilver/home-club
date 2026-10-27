import { z } from 'zod';
import type { Locale } from '@/data/schema';
import type { Currency } from '@/lib/money';

// Cookie that carries the visitor's currency choice (SPEC 6). The proxy reads it and rewrites the
// public URL to the hidden `[currency]` route segment (owner decision 8).
export const CURRENCY_COOKIE = 'hc_currency';

export const CURRENCIES = ['USD', 'THB'] as const satisfies readonly Currency[];

// Lowercase form used for the internal route segment: /en/usd/shop, /th/thb/shop.
export const CURRENCY_SEGMENTS = ['usd', 'thb'] as const;
export type CurrencySegment = (typeof CURRENCY_SEGMENTS)[number];

const currencySchema = z.enum(CURRENCIES);
const segmentSchema = z.enum(CURRENCY_SEGMENTS);

/** Validates untrusted input (cookie, storage) and returns the currency, or null when invalid. */
export function parseCurrency(value: unknown): Currency | null {
  const result = currencySchema.safeParse(value);
  return result.success ? result.data : null;
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
  const result = segmentSchema.safeParse(segment);
  if (!result.success) return null;
  return result.data === 'thb' ? 'THB' : 'USD';
}

/** The cookie value when valid, otherwise the locale default. */
export function resolveCurrency(cookieValue: unknown, locale: Locale): Currency {
  return parseCurrency(cookieValue) ?? defaultCurrencyFor(locale);
}
