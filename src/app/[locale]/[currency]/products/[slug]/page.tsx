import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import { ProductDetails } from '@/components/product/product-details';
import { SizeGuide } from '@/components/product/size-guide';
import { ProductCard } from '@/components/catalogue/product-card';
import { JsonLd } from '@/components/seo/json-ld';
import { LOOKS } from '@/data/looks';
import { Container } from '@/components/ui/container';
import { LOCALES } from '@/data/locales';
import { resolveRouteParams } from '@/i18n/params';
import { getAllProducts, getCategory, getProductBySlug } from '@/lib/catalogue';
import { CURRENCY_SEGMENTS } from '@/lib/currency';
import { publicPath } from '@/lib/locale-path';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbJsonLd, productJsonLd } from '@/lib/structured-data';

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
  return pageMetadata({
    locale,
    path: `/products/${product.slug}`,
    title: product.name[locale],
    description: product.description[locale],
  });
}
export default async function ProductPage({ params }: Props): Promise<ReactElement> {
  const { locale, currency } = await resolveRouteParams(params);
  setRequestLocale(locale);
  const product = getProductBySlug((await params).slug);
  if (!product) notFound();
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: 'content' });
  const catalogue = await getTranslations({ locale, namespace: 'catalogue' });
  const category = getCategory(product.category);
  const crumbs = breadcrumbJsonLd([
    // Same trail as the collection pages' visible breadcrumb, extended by the product.
    { name: catalogue('page.home'), path: publicPath(locale) },
    { name: catalogue('page.shop'), path: publicPath(locale, '/shop') },
    ...(category
      ? [{ name: category.name[locale], path: publicPath(locale, `/collections/${category.id}`) }]
      : []),
    { name: product.name[locale], path: publicPath(locale, `/products/${product.slug}`) },
  ]);
  const look = LOOKS.find((item) =>
    Object.values(item.slots).some((slot) => slot.allowedProductIds.includes(product.id)),
  );
  const related = look
    ? getAllProducts().filter(
        (item) =>
          item.id !== product.id &&
          Object.values(look.slots).some((slot) => slot.defaultProductId === item.id),
      )
    : [];
  return (
    <Container as="main" className="py-12 md:py-16">
      <JsonLd data={[productJsonLd(product, locale, currency), crumbs]} />
      <div id="main" tabIndex={-1} className="space-y-12">
        <NextIntlClientProvider messages={{ product: messages.product, cart: messages.cart }}>
          <ProductDetails
            key={product.slug}
            product={product}
            locale={locale}
            currency={currency}
          />
        </NextIntlClientProvider>
        <NextIntlClientProvider messages={{ sizeGuide: messages.sizeGuide }}>
          <SizeGuide locale={locale} />
        </NextIntlClientProvider>
        {related.length ? (
          <section aria-labelledby="goes-with-heading" className="space-y-6">
            <h2 id="goes-with-heading" className="text-h2">
              {t('goesWith')}
            </h2>
            <ul className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {related.map((item) => (
                <li key={item.id}>
                  <ProductCard product={item} locale={locale} currency={currency} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Container>
  );
}
