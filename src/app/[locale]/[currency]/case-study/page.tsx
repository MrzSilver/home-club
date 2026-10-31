import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { CaseStudyContent } from '@/components/case-study/case-study-content';
import { withOgImage } from '@/components/og/og-metadata';
import { Container } from '@/components/ui/container';
import { LOCALES } from '@/data/locales';
import { resolveRouteParams } from '@/i18n/params';
import { CURRENCY_SEGMENTS } from '@/lib/currency';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string; currency: string }> };

export const dynamicParams = false;

export function generateStaticParams(): { locale: string; currency: string }[] {
  return LOCALES.flatMap((locale) => CURRENCY_SEGMENTS.map((currency) => ({ locale, currency })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await resolveRouteParams(params);
  const seo = await getTranslations({ locale, namespace: 'seo' });
  return withOgImage(
    pageMetadata({
      locale,
      path: '/case-study',
      title: seo('caseStudyTitle'),
      description: seo('caseStudyDescription'),
    }),
    locale,
    { kind: 'home' },
  );
}

/** Case study (FR-062): problem, constraints, stack, trade-offs, measured results, links. */
export default async function CaseStudyPage({ params }: Props): Promise<ReactElement> {
  const { locale } = await resolveRouteParams(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'caseStudy' });
  return (
    <Container as="main" className="py-12">
      <div id="main" tabIndex={-1} className="space-y-section">
        <header className="max-w-prose space-y-4">
          <p className="text-eyebrow uppercase-latin text-muted">{t('eyebrow')}</p>
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-h3 font-normal">{t('lead')}</p>
        </header>
        <CaseStudyContent locale={locale} />
      </div>
    </Container>
  );
}
