import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { Container } from '@/components/ui/container';
import { LocaleLinks } from '@/components/ui/locale-links';
import { Wordmark } from '@/components/ui/wordmark';
import { localeFromParam, resolveRouteParams } from '@/i18n/params';
import { languageAlternates } from '@/lib/locale-path';
import { convertFromUsdCents, formatMoney } from '@/lib/money';

type HomePageProps = {
  params: Promise<{ locale: string; currency: string }>;
};

// Price shown by the temporary page: the essential tee, in USD cents (SPEC 5).
const SAMPLE_PRICE_USD_CENTS = 4900;

// Unknown locale or currency values answer 404 without rendering: every valid page is prerendered.
export const dynamicParams = false;

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const locale = localeFromParam((await params).locale);
  const t = await getTranslations({ locale, namespace: 'seo' });
  return { title: { absolute: t('homeTitle') }, alternates: languageAlternates(locale) };
}

// TEMPORARY (T03): proves locale + currency routing end to end. T07 replaces it with the real home.
export default async function HomePage({ params }: HomePageProps): Promise<ReactElement> {
  const { locale, currency } = await resolveRouteParams(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });
  const common = await getTranslations({ locale, namespace: 'common' });
  const price = formatMoney(
    convertFromUsdCents(SAMPLE_PRICE_USD_CENTS, currency),
    currency,
    locale,
  );

  return (
    <main id="main">
      <Container className="py-section">
        <Wordmark
          name={common('wordmark.name')}
          descriptor={common('wordmark.descriptor')}
          align="start"
        />
        <p className="mt-8 text-eyebrow uppercase-latin text-muted">{t('eyebrow')}</p>
        <h1 className="mt-2 max-w-prose text-display uppercase-latin">{t('title')}</h1>
        <p className="mt-4 max-w-prose text-body text-muted">{t('intro')}</p>
        <p className="mt-6 text-body">
          <span className="text-muted">{t('samplePriceLabel')}</span>{' '}
          <span data-testid="sample-price" data-currency={currency} className="font-semibold">
            {price}
          </span>
        </p>
        <p className="mt-6 text-body text-muted">{common('locale.label')}</p>
        <LocaleLinks labels={{ en: common('locale.en'), th: common('locale.th') }} />
      </Container>
    </main>
  );
}
