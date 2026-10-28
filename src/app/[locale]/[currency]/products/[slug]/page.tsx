import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import { ProductDetails } from '@/components/product/product-details';
import { Container } from '@/components/ui/container';
import { LOCALES } from '@/data/locales';
import { resolveRouteParams } from '@/i18n/params';
import { getAllProducts, getProductBySlug } from '@/lib/catalogue';
import { CURRENCY_SEGMENTS } from '@/lib/currency';
import { languageAlternates } from '@/lib/locale-path';
import { openGraphLocales } from '@/lib/seo';

type Props = { params: Promise<{ locale: string; currency: string; slug: string }> };
export const dynamicParams = false;
export function generateStaticParams(): { locale: string; currency: string; slug: string }[] {
  return LOCALES.flatMap((locale) =>
    CURRENCY_SEGMENTS.flatMap((currency) =>
      getAllProducts().map(({ slug }) => ({ locale, currency, slug })),
    ),
  );
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await resolveRouteParams(params);
  const product = getProductBySlug((await params).slug);
  if (!product) notFound();
  const alternates = languageAlternates(locale, `/products/${product.slug}`);
  return {
    title: product.name[locale],
    description: product.description[locale],
    alternates,
    openGraph: {
      title: product.name[locale],
      description: product.description[locale],
      url: alternates.canonical,
      ...openGraphLocales(locale),
    },
  };
}
export default async function ProductPage({ params }: Props): Promise<ReactElement> {
  const { locale, currency } = await resolveRouteParams(params);
  setRequestLocale(locale);
  const product = getProductBySlug((await params).slug);
  if (!product) notFound();
  const messages = await getMessages({ locale });
  return (
    <Container as="main" className="py-12 md:py-16">
      <div id="main" tabIndex={-1}>
        <NextIntlClientProvider messages={{ product: messages.product, cart: messages.cart }}>
          <ProductDetails
            key={product.slug}
            product={product}
            locale={locale}
            currency={currency}
          />
        </NextIntlClientProvider>
      </div>
    </Container>
  );
}
