import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { CategoryTiles } from '@/components/home/category-tiles';
import { EssentialsGrid } from '@/components/home/essentials-grid';
import { Hero } from '@/components/home/hero';
import { LookTeaser } from '@/components/home/look-teaser';
import { EditorialTeaser } from '@/components/home/editorial-teaser';
import { VibesGrid } from '@/components/content/vibes-grid';
import { Container } from '@/components/ui/container';
import { TrustStrip } from '@/components/home/trust-strip';
import { localeFromParam, resolveRouteParams } from '@/i18n/params';
import { languageAlternates } from '@/lib/locale-path';
import { openGraphLocales } from '@/lib/seo';

type HomePageProps = {
  params: Promise<{ locale: string; currency: string }>;
};

// Unknown locale or currency values answer 404 without rendering: every valid page is prerendered.
export const dynamicParams = false;

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const locale = localeFromParam((await params).locale);
  const t = await getTranslations({ locale, namespace: 'seo' });
  const common = await getTranslations({ locale, namespace: 'common' });
  const alternates = languageAlternates(locale);
  return {
    title: { absolute: t('homeTitle') },
    description: t('homeDescription'),
    alternates,
    // The share image is a P4 task (SPEC 10); until then there is no og:image.
    openGraph: {
      type: 'website',
      siteName: common('brandName'),
      title: t('homeTitle'),
      description: t('homeDescription'),
      url: alternates.canonical,
      ...openGraphLocales(locale),
    },
  };
}

/**
 * Home (FR-010, FR-011, FR-012, FR-015). The hero comes first and carries the sentinel that turns the
 * header solid; the content sheet that follows overlaps its bottom edge by a rounded top.
 * The look teaser, tips and vibes sections (FR-013, FR-014, FR-016) arrive with phase 2.
 */
export default async function HomePage({ params }: HomePageProps): Promise<ReactElement> {
  const { locale, currency } = await resolveRouteParams(params);
  setRequestLocale(locale);

  return (
    <main id="main">
      <Hero locale={locale} />
      <div className="relative z-10 -mt-6 rounded-t-md bg-canvas pt-6">
        <div className="flex flex-col gap-12 md:gap-16 xl:gap-24">
          <CategoryTiles locale={locale} />
          <EssentialsGrid locale={locale} currency={currency} />
          <LookTeaser locale={locale} currency={currency} />
          <EditorialTeaser locale={locale} />
          <TrustStrip locale={locale} />
          <Container>
            <VibesGrid locale={locale} />
          </Container>
        </div>
      </div>
    </main>
  );
}
