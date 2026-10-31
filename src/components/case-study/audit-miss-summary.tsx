import { getFormatter, getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { createAuditFormat } from '@/components/case-study/audit-format';
import type { Locale } from '@/data/schema';
import type { AuditReport } from '@/content/case-study';

/**
 * One visible sentence per missed budget in an earlier run, so a miss is not hidden inside the
 * collapsed disclosure (RULES 1.3). Renders nothing when every earlier run passed.
 */
export async function AuditMissSummary({
  locale,
  reports,
}: {
  locale: Locale;
  reports: AuditReport[];
}): Promise<ReactElement | null> {
  const t = await getTranslations({ locale, namespace: 'caseStudy.performance' });
  const format = createAuditFormat(await getFormatter({ locale }));
  const misses = reports.flatMap((report) =>
    report.failures.map((failure) => ({ report, failure })),
  );
  if (misses.length === 0) return null;
  return (
    <ul className="max-w-prose space-y-1" data-testid="audit-miss-summary">
      {misses.map(({ report, failure }) => (
        <li key={`${report.id}-${failure.route}-${failure.metric}`}>
          {t('missSummary', {
            n: report.id.slice(1),
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
