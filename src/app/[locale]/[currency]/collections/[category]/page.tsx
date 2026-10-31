import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { CollectionView } from '@/components/catalogue/collection-view';
import { JsonLd } from '@/components/seo/json-ld';
import { LOCALES } from '@/data/locales';
import { localeFromParam, resolveRouteParams } from '@/i18n/params';
import { getAllCategories, getCategory, getProductsByCategory } from '@/lib/catalogue';
import { CURRENCY_SEGMENTS } from '@/lib/currency';
import { publicPath } from '@/lib/locale-path';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/structured-data';

type CategoryPageProps = {
  params: Promise<{ locale: string; currency: string; category: string }>;
};

// An unlisted category is a 404 that is never rendered or cached (ADR-0003).
export const dynamicParams = false;

export function generateStaticParams(): { locale: string; currency: string; category: string }[] {
  return LOCALES.flatMap((locale) =>
    CURRENCY_SEGMENTS.flatMap((currency) =>
      getAllCategories().map((category) => ({ locale, currency, category: category.id })),
    ),
  );
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { locale: rawLocale, category: rawCategory } = await params;
  const locale = localeFromParam(rawLocale);
  const category = getCategory(rawCategory);
  if (category === undefined) notFound();
  const t = await getTranslations({ locale, namespace: 'seo' });
  return pageMetadata({
    locale,
    path: `/collections/${category.id}`,
    title: category.name[locale],
    description: t('collectionDescription', {
      name: category.name[locale],
      subtitle: category.subtitle[locale],
      count: getProductsByCategory(category.id).length,
    }),
  });
}

/** A category page (FR-020): the same filters and sort as "Shop all", scoped to one category. */
export default async function CategoryPage({ params }: CategoryPageProps): Promise<ReactElement> {
  const { locale, currency } = await resolveRouteParams(params);
  setRequestLocale(locale);
  const category = getCategory((await params).category);
  if (category === undefined) notFound();

  const t = await getTranslations({ locale, namespace: 'catalogue' });
  const crumbs = breadcrumbJsonLd([
    { name: t('page.home'), path: publicPath(locale) },
    { name: t('page.shop'), path: publicPath(locale, '/shop') },
    { name: category.name[locale], path: publicPath(locale, `/collections/${category.id}`) },
  ]);

  return (
    <>
      <JsonLd data={crumbs} />
      <CollectionView locale={locale} currency={currency} category={category} />
    </>
  );
}
