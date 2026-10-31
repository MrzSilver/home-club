import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { AuditTable } from '@/components/case-study/audit-table';
import { AuditMissSummary } from '@/components/case-study/audit-miss-summary';
import { CaseStudySection } from '@/components/case-study/case-study-section';
import type { Locale } from '@/data/schema';
import { loadAuditReports } from '@/content/case-study';

/**
 * Measured results (FR-062). The latest gated run is open; earlier phases sit in a native disclosure
 * (no JavaScript) and use the same table, so every number on the page comes from a stored audit file.
 */
export async function PerformanceSection({ locale }: { locale: Locale }): Promise<ReactElement> {
  const t = await getTranslations({ locale, namespace: 'caseStudy.performance' });
  const { latest, earlier } = loadAuditReports();
  return (
    <CaseStudySection id="performance" heading={t('heading')} intro={t('intro')}>
      <AuditTable locale={locale} report={latest} />
      <p className="max-w-prose text-small text-muted">{t('noteLocal')}</p>
      <AuditMissSummary locale={locale} reports={earlier} />
      <details className="space-y-6">
        <summary className="inline-flex min-h-11 cursor-pointer items-center underline underline-offset-4">
          {t('earlier')}
        </summary>
        <div className="space-y-8 pt-4">
          {earlier.map((report) => (
            <AuditTable key={report.id} locale={locale} report={report} />
          ))}
        </div>
      </details>
    </CaseStudySection>
  );
}
