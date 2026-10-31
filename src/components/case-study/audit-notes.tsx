import { getFormatter, getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { createAuditFormat } from '@/components/case-study/audit-format';
import type { Locale } from '@/data/schema';
import type { AuditReport } from '@/content/case-study';

type AuditNotesProps = { locale: Locale; report: AuditReport };

/** What the budget gate said about one run, built from the file: every run states its result. */
export async function AuditNotes({ locale, report }: AuditNotesProps): Promise<ReactElement> {
  const t = await getTranslations({ locale, namespace: 'caseStudy.performance' });
  const format = createAuditFormat(await getFormatter({ locale }));

  if (report.gatePassed && report.failures.length === 0) {
    return <p className="text-small text-muted">{t('gatePassed')}</p>;
  }
  return (
    <ul className="space-y-1 text-small text-muted">
      {report.failures.map((failure) => (
        <li key={`${failure.route}-${failure.metric}`}>
          {t('gateMiss', {
            metric: t(`columns.${failure.metric}`),
            route: failure.route,
            actual: format.metric(failure.metric, failure.actual),
            limit: format.metric(failure.metric, failure.limit),
          })}{' '}
          {failure.fixed
            ? t('gateFixed', {
                phase: t('phase', { n: failure.fixed.id.slice(1) }),
                actual: format.metric(failure.metric, failure.fixed.actual),
              })
            : null}
        </li>
      ))}
    </ul>
  );
}
