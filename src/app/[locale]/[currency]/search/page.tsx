import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import { SearchPage } from '@/components/search/search-page';
import { getSearchIndex } from '@/components/search/search-index';
import { Container } from '@/components/ui/container';
import { resolveRouteParams } from '@/i18n/params';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string; currency: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await resolveRouteParams(params);
  const t = await getTranslations({ locale, namespace: 'search' });
  return pageMetadata({
    locale,
    path: '/search',
    title: t('title'),
    description: t('hint'),
    noindex: true,
  });
}
export default async function Page({ params }: Props): Promise<ReactElement> {
  const { locale } = await resolveRouteParams(params);
  setRequestLocale(locale);
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: 'search' });
  return (
    <Container as="main" className="py-12">
      <div id="main" tabIndex={-1} className="space-y-8">
        <h1 className="text-h1">{t('title')}</h1>
        <NextIntlClientProvider messages={{ search: messages.search }}>
          <SearchPage entries={getSearchIndex(locale)} locale={locale} />
        </NextIntlClientProvider>
      </div>
    </Container>
  );
}
