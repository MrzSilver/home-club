import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import { Confirmation } from '@/components/checkout/confirmation';
import { Container } from '@/components/ui/container';
import { buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { resolveRouteParams } from '@/i18n/params';

type Props = { params: Promise<{ locale: string; currency: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await resolveRouteParams(params);
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return { title: t('success'), robots: { index: false, follow: false } };
}
export default async function Page({ params }: Props): Promise<ReactElement> {
  const { locale } = await resolveRouteParams(params);
  setRequestLocale(locale);
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return (
    <Container as="main" className="py-12">
      <div id="main" tabIndex={-1} className="space-y-8">
        <h1 className="text-h1">{t('success')}</h1>
        <p>{t('demo')}</p>
        <NextIntlClientProvider messages={{ checkout: messages.checkout }}>
          <Confirmation />
        </NextIntlClientProvider>
        <Link href="/shop" className={buttonClasses()}>
          {t('shop')}
        </Link>
      </div>
    </Container>
  );
}
