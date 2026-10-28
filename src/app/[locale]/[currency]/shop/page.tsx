import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { CollectionView } from '@/components/catalogue/collection-view';
import { CURRENCY_SEGMENTS } from '@/lib/currency';
import { LOCALES } from '@/data/locales';
import { localeFromParam, resolveRouteParams } from '@/i18n/params';
import { languageAlternates } from '@/lib/locale-path';
import { openGraphLocales } from '@/lib/seo';

type ShopPageProps = {
  params: Promise<{ locale: string; currency: string }>;
};

// Unknown locale or currency values answer 404 without rendering: every valid page is prerendered.
export const dynamicParams = false;

export function generateStaticParams(): { locale: string; currency: string }[] {
  return LOCALES.flatMap((locale) => CURRENCY_SEGMENTS.map((currency) => ({ locale, currency })));
}

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const locale = localeFromParam((await params).locale);
  const t = await getTranslations({ locale, namespace: 'seo' });
  const common = await getTranslations({ locale, namespace: 'common' });
  const alternates = languageAlternates(locale, '/shop');
  // Canonical and hreflang point at the public path without a query string: filtered views are the
  // same page. A noindex for them cannot be set on a static page (ADR-0006, SEO follow-up in P3).
  return {
    title: t('shopTitle'),
    description: t('shopDescription'),
    alternates,
    openGraph: {
      type: 'website',
      siteName: common('brandName'),
      title: t('shopTitle'),
      description: t('shopDescription'),
      url: alternates.canonical,
      ...openGraphLocales(locale),
    },
  };
}

/** "Shop all" (FR-020): every product, filterable and sortable from the URL. */
export default async function ShopPage({ params }: ShopPageProps): Promise<ReactElement> {
  const { locale, currency } = await resolveRouteParams(params);
  setRequestLocale(locale);

  return <CollectionView locale={locale} currency={currency} category={null} />;
}
