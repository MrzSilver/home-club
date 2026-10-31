import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import { LookBuilderLoader } from '@/components/look/look-builder-loader';
import { Container } from '@/components/ui/container';
import { LOOKS } from '@/data/looks';
import { PRODUCTS } from '@/data/products';
import { resolveRouteParams } from '@/i18n/params';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string; currency: string; slug: string }> };
export const dynamicParams = false;
export function generateStaticParams(): { slug: string }[] {
  return LOOKS.map((look) => ({ slug: look.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await resolveRouteParams(params);
  const slug = (await params).slug;
  const current = LOOKS.find((l) => l.slug === slug);
  if (!current) notFound();
  const seo = await getTranslations({ locale, namespace: 'seo' });
  return pageMetadata({
    locale,
    path: `/looks/${slug}`,
    title: current.name[locale],
    description: seo('lookDescription', { description: current.description[locale] }),
  });
}
export default async function LookPage({ params }: Props): Promise<ReactElement> {
  const { locale, currency } = await resolveRouteParams(params);
  setRequestLocale(locale);
  const slug = (await params).slug;
  const look = LOOKS.find((l) => l.slug === slug);
  if (!look) notFound();
  const messages = await getMessages({ locale });
  const ids = Object.values(look.slots).flatMap((slot) => slot.allowedProductIds);
  return (
    <Container as="main" className="py-12 md:py-16">
      <div id="main" tabIndex={-1} className="space-y-8">
        <header className="space-y-4">
          <h1 className="text-h1">{look.name[locale]}</h1>
          <p>{look.description[locale]}</p>
        </header>
        <NextIntlClientProvider messages={{ look: messages.look, cart: messages.cart }}>
          <LookBuilderLoader
            look={look}
            products={PRODUCTS.filter((p) => ids.includes(p.id))}
            locale={locale}
            currency={currency}
          />
        </NextIntlClientProvider>
      </div>
    </Container>
  );
}
