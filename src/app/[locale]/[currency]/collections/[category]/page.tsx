import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { CollectionView } from '@/components/catalogue/collection-view';
import { LOCALES } from '@/data/locales';
import { localeFromParam, resolveRouteParams } from '@/i18n/params';
import { getAllCategories, getCategory, getProductsByCategory } from '@/lib/catalogue';
import { CURRENCY_SEGMENTS } from '@/lib/currency';
import { languageAlternates } from '@/lib/locale-path';
import { openGraphLocales } from '@/lib/seo';

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
  const common = await getTranslations({ locale, namespace: 'common' });
  const alternates = languageAlternates(locale, `/collections/${category.id}`);
  const title = category.name[locale];
  const description = t('collectionDescription', {
    name: title,
    subtitle: category.subtitle[locale],
    count: getProductsByCategory(category.id).length,
  });
  return {
    title,
    description,
    alternates,
    openGraph: {
      type: 'website',
      siteName: common('brandName'),
      title,
      description,
      url: alternates.canonical,
      ...openGraphLocales(locale),
    },
  };
}

/** A category page (FR-020): the same filters and sort as "Shop all", scoped to one category. */
export default async function CategoryPage({ params }: CategoryPageProps): Promise<ReactElement> {
  const { locale, currency } = await resolveRouteParams(params);
  setRequestLocale(locale);
  const category = getCategory((await params).category);
  if (category === undefined) notFound();

  return <CollectionView locale={locale} currency={currency} category={category} />;
}
