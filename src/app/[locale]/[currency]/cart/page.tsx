import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import { CartContents } from '@/components/cart/cart-contents';
import { Container } from '@/components/ui/container';
import { LOCALES } from '@/data/locales';
import { resolveRouteParams } from '@/i18n/params';
import { CURRENCY_SEGMENTS } from '@/lib/currency';
import { languageAlternates } from '@/lib/locale-path';

type Props = { params: Promise<{ locale: string; currency: string }> };
export const dynamicParams = false;
export function generateStaticParams(): { locale: string; currency: string }[] {
  return LOCALES.flatMap((locale) => CURRENCY_SEGMENTS.map((currency) => ({ locale, currency })));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await resolveRouteParams(params);
  const t = await getTranslations({ locale, namespace: 'cart' });
  return {
    title: t('title'),
    description: t('demo'),
    alternates: languageAlternates(locale, '/cart'),
    robots: { index: false, follow: true },
  };
}
export default async function CartPage({ params }: Props): Promise<ReactElement> {
  const { locale } = await resolveRouteParams(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'cart' });
  return (
    <Container as="main" className="py-12 md:py-16">
      <div id="main" tabIndex={-1} className="mx-auto max-w-prose">
        <h1 className="mb-8 text-h1">{t('title')}</h1>
        <CartContents />
      </div>
    </Container>
  );
}
