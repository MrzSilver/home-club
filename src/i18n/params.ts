import { notFound } from 'next/navigation';

import type { Locale } from '@/data/schema';
import { segmentToCurrency } from '@/lib/currency';
import { isLocale } from '@/lib/locale-path';
import type { Currency } from '@/lib/money';

// Route params arrive as untrusted strings (RULES 2.3). These helpers validate them once and answer
// notFound() for anything else, so pages work with the narrowed types.

export function localeFromParam(raw: string): Locale {
  if (!isLocale(raw)) notFound();
  return raw;
}

export function currencyFromParam(raw: string): Currency {
  const currency = segmentToCurrency(raw);
  if (currency === null) notFound();
  return currency;
}

export async function resolveRouteParams(
  params: Promise<{ locale: string; currency: string }>,
): Promise<{ locale: Locale; currency: Currency }> {
  const { locale, currency } = await params;
  return { locale: localeFromParam(locale), currency: currencyFromParam(currency) };
}
