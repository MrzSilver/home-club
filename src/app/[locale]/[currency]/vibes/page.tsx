import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import { VibesGrid } from '@/components/content/vibes-grid';
import { Container } from '@/components/ui/container';
import { resolveRouteParams } from '@/i18n/params';
import { withOgImage } from '@/components/og/og-metadata';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string; currency: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await resolveRouteParams(params);
  const seo = await getTranslations({ locale, namespace: 'seo' });
  return withOgImage(
    pageMetadata({
      locale,
      path: '/vibes',
      title: seo('vibesTitle'),
      description: seo('vibesDescription'),
    }),
    locale,
    { kind: 'home' },
  );
}
export default async function VibesPage({ params }: Props): Promise<ReactElement> {
  const { locale } = await resolveRouteParams(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'content' });
  return (
    <Container as="main" className="py-12">
      <div id="main" tabIndex={-1} className="space-y-8">
        <h1 className="text-h1">{t('vibes')}</h1>
        <p>{t('vibesDescription')}</p>
        <VibesGrid locale={locale} />
      </div>
    </Container>
  );
}
