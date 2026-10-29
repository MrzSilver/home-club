import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import { Container } from '@/components/ui/container';
import { buttonClasses } from '@/components/ui/button';
import { LOOKS } from '@/data/looks';
import { Link } from '@/i18n/navigation';
import { resolveRouteParams } from '@/i18n/params';
import { languageAlternates } from '@/lib/locale-path';

type Props = { params: Promise<{ locale: string; currency: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await resolveRouteParams(params);
  const t = await getTranslations({ locale, namespace: 'look' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: languageAlternates(locale, '/looks'),
  };
}
export default async function LooksPage({ params }: Props): Promise<ReactElement> {
  const { locale } = await resolveRouteParams(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'look' });
  return (
    <Container as="main" className="space-y-8 py-12 md:py-16">
      <div id="main" tabIndex={-1} className="space-y-8">
        <h1 className="text-h1">{t('title')}</h1>
        <p>{t('description')}</p>
        {LOOKS.map((look) => (
          <article key={look.id} className="space-y-4 rounded-md bg-surface p-8">
            <h2 className="text-h2">{look.name[locale]}</h2>
            <p>{look.description[locale]}</p>
            <Link href={`/looks/${look.slug}`} className={buttonClasses()}>
              {t('build')}
            </Link>
          </article>
        ))}
      </div>
    </Container>
  );
}
