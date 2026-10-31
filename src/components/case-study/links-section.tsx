import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { CaseStudySection } from '@/components/case-study/case-study-section';
import { ExternalLink } from '@/components/case-study/external-link';
import type { Locale } from '@/data/schema';
import { CASE_STUDY_LINKS } from '@/content/case-study';

/** Source, live site and asset register: the evidence behind the page (FR-062). */
export async function LinksSection({ locale }: { locale: Locale }): Promise<ReactElement> {
  const t = await getTranslations({ locale, namespace: 'caseStudy' });
  const newTab = t('links.newTab');
  return (
    <CaseStudySection id="links" heading={t('links.heading')}>
      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-6">
        <li>
          <ExternalLink href={CASE_STUDY_LINKS.source} newTabLabel={newTab}>
            {t('links.source')}
          </ExternalLink>
        </li>
        <li>
          <ExternalLink href={CASE_STUDY_LINKS.live} newTabLabel={newTab}>
            {t('links.live')}
          </ExternalLink>
        </li>
        <li>
          <ExternalLink href={CASE_STUDY_LINKS.assets} newTabLabel={newTab}>
            {t('links.assets')}
          </ExternalLink>
        </li>
      </ul>
    </CaseStudySection>
  );
}
