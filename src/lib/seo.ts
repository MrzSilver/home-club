import type { Locale } from '@/data/schema';

// Open Graph writes a locale as language_TERRITORY. Thai is th_TH; English is the US form the site's
// formatting already uses (en-US in lib/money.ts).
const OPEN_GRAPH_LOCALE: Readonly<Record<Locale, string>> = { en: 'en_US', th: 'th_TH' };

export type OpenGraphLocales = { locale: string; alternateLocale: string[] };

/** `og:locale` for a page and `og:locale:alternate` for the other languages it exists in. */
export function openGraphLocales(locale: Locale): OpenGraphLocales {
  return {
    locale: OPEN_GRAPH_LOCALE[locale],
    alternateLocale: (Object.keys(OPEN_GRAPH_LOCALE) as Locale[])
      .filter((other) => other !== locale)
      .map((other) => OPEN_GRAPH_LOCALE[other]),
  };
}
