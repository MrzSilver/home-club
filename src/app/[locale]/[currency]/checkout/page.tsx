import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { Container } from '@/components/ui/container';
import { resolveRouteParams } from '@/i18n/params';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string; currency: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await resolveRouteParams(params);
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return pageMetadata({
    locale,
    path: '/checkout',
    title: t('title'),
    description: t('demo'),
    noindex: true,
  });
}
export default async function CheckoutPage({ params }: Props): Promise<ReactElement> {
  const { locale, currency } = await resolveRouteParams(params);
  setRequestLocale(locale);
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return (
    <Container as="main" className="py-12">
      <div id="main" tabIndex={-1} className="space-y-8">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="rounded-md bg-surface p-4">{t('demo')}</p>
        <NextIntlClientProvider messages={{ checkout: messages.checkout }}>
          <CheckoutForm currency={currency} />
        </NextIntlClientProvider>
      </div>
    </Container>
  );
}
