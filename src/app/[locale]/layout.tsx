import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement, ReactNode } from 'react';

import { CartProvider } from '@/components/cart/cart-provider';
import { getAllProducts } from '@/lib/catalogue';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { SkipLink } from '@/components/ui/skip-link';
import type { Locale } from '@/data/schema';
import { localeFromParam } from '@/i18n/params';
import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';
import { fontVariables } from '@/styles/fonts';
import '@/styles/globals.css';

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

// Root layout of the app: `<html>` lives here because the locale decides its `lang` attribute.
// Importing `env` also makes a bad NEXT_PUBLIC_SITE_URL fail the build, not a request.
export const dynamicParams = false;

export function generateStaticParams(): { locale: Locale }[] {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const locale = localeFromParam((await params).locale);
  const t = await getTranslations({ locale, namespace: 'seo' });
  return {
    metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
    title: { default: t('homeTitle'), template: t('titleTemplate') },
    description: t('siteDescription'),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps): Promise<ReactElement> {
  const locale = localeFromParam((await params).locale);
  // Opts the whole subtree into static rendering: next-intl then reads the locale from here, not
  // from request headers.
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'a11y' });
  const messages = await getMessages({ locale });
  const products = getAllProducts().map(({ slug, name, priceCents, colors, variants, images }) => ({
    slug,
    name,
    priceCents,
    colors,
    variants,
    images: colors.flatMap((color) => {
      const image = images.find((item) => item.colorId === color.id);
      return image ? [image] : [];
    }),
  }));

  return (
    <html lang={locale} className={fontVariables}>
      <body>
        {/*
          Gives client components (the i18n Link, the header and footer islands) their locale. Messages stay
          out of the client bundle: a client component that needs strings receives just those
          (`messages={pick(...)}` on its own provider, or props).
        */}
        <NextIntlClientProvider locale={locale} messages={{ cart: messages.cart }}>
          <CartProvider products={products} locale={locale}>
            <SkipLink label={t('skipToContent')} />
            <Header locale={locale} />
            {children}
            <Footer locale={locale} />
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
