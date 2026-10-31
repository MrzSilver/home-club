import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { CaseStudySection } from '@/components/case-study/case-study-section';
import { LinksSection } from '@/components/case-study/links-section';
import { PerformanceSection } from '@/components/case-study/performance-section';
import { TitledItems, type TitledItem } from '@/components/case-study/titled-items';
import type { Locale } from '@/data/schema';
import { STACK_ITEMS } from '@/content/case-study';

const GOALS = ['look', 'speed', 'look2', 'i18n', 'explain'] as const;
const CONSTRAINTS = ['bilingual', 'money', 'static', 'csp', 'budgets', 'a11y'] as const;
const TRADEOFFS = ['currency', 'filters', 'csp', 'og', 'images'] as const;
const QUALITY = ['axe', 'keyboard', 'tests'] as const;

/** The body of the case-study page, in reading order (FR-062): problem to links. */
export async function CaseStudyContent({ locale }: { locale: Locale }): Promise<ReactElement> {
  const t = await getTranslations({ locale, namespace: 'caseStudy' });

  const constraints: TitledItem[] = CONSTRAINTS.map((id) => ({
    id,
    title: t(`constraints.items.${id}.title`),
    body: t(`constraints.items.${id}.body`),
  }));
  const tradeoffs: TitledItem[] = TRADEOFFS.map((id) => ({
    id,
    title: t(`tradeoffs.items.${id}.title`),
    body: t(`tradeoffs.items.${id}.body`),
  }));

  return (
    <div className="space-y-section">
      <CaseStudySection id="intro" heading={t('intro.heading')}>
        <div className="max-w-prose space-y-4">
          <p>{t('intro.p1')}</p>
          <p>{t('intro.p2')}</p>
        </div>
      </CaseStudySection>

      <CaseStudySection id="problem" heading={t('problem.heading')} intro={t('problem.intro')}>
        <ol className="max-w-prose list-decimal space-y-3 ps-6">
          {GOALS.map((id) => (
            <li key={id}>{t(`problem.goals.${id}`)}</li>
          ))}
        </ol>
      </CaseStudySection>

      <CaseStudySection
        id="constraints"
        heading={t('constraints.heading')}
        intro={t('constraints.intro')}
      >
        <TitledItems items={constraints} />
      </CaseStudySection>

      <CaseStudySection id="stack" heading={t('stack.heading')} intro={t('stack.intro')}>
        <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">
          {STACK_ITEMS.map((item) => (
            <div key={item.id} className="space-y-1 border-t border-line pt-3">
              <dt className="text-h3">{item.name}</dt>
              <dd>{t(`stack.items.${item.id}`)}</dd>
            </div>
          ))}
        </dl>
      </CaseStudySection>

      <CaseStudySection
        id="tradeoffs"
        heading={t('tradeoffs.heading')}
        intro={t('tradeoffs.intro')}
      >
        <TitledItems items={tradeoffs} />
      </CaseStudySection>

      <PerformanceSection locale={locale} />

      <CaseStudySection id="quality" heading={t('quality.heading')} intro={t('quality.intro')}>
        <ul className="max-w-prose list-disc space-y-3 ps-6">
          {QUALITY.map((id) => (
            <li key={id}>{t(`quality.items.${id}`)}</li>
          ))}
        </ul>
        <p className="max-w-prose text-muted">{t('quality.screenReader')}</p>
      </CaseStudySection>

      <LinksSection locale={locale} />
    </div>
  );
}
