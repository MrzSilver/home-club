import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { CollectionView } from '@/components/catalogue/collection-view';
import { JsonLd } from '@/components/seo/json-ld';
import { CURRENCY_SEGMENTS } from '@/lib/currency';
import { LOCALES } from '@/data/locales';
import { localeFromParam, resolveRouteParams } from '@/i18n/params';
import { publicPath } from '@/lib/locale-path';
import { withOgImage } from '@/components/og/og-metadata';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/structured-data';

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
  // Canonical and hreflang point at the public path without a query string: filtered views are the
  // same page. A noindex for them cannot be set on a static page (ADR-0006, SEO follow-up in P3).
  return withOgImage(
    pageMetadata({
      locale,
      path: '/shop',
      title: t('shopTitle'),
      description: t('shopDescription'),
    }),
    locale,
    { kind: 'home' },
  );
}

/** "Shop all" (FR-020): every product, filterable and sortable from the URL. */
export default async function ShopPage({ params }: ShopPageProps): Promise<ReactElement> {
  const { locale, currency } = await resolveRouteParams(params);
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'catalogue' });
  const crumbs = breadcrumbJsonLd([
    { name: t('page.home'), path: publicPath(locale) },
    { name: t('page.shop'), path: publicPath(locale, '/shop') },
  ]);

  return (
    <>
      <JsonLd data={crumbs} />
      <CollectionView locale={locale} currency={currency} category={null} />
    </>
  );
}
