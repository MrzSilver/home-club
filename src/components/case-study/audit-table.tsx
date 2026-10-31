import { getFormatter, getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { AuditNotes } from '@/components/case-study/audit-notes';
import { createAuditFormat } from '@/components/case-study/audit-format';
import { ExternalLink } from '@/components/case-study/external-link';
import type { Locale } from '@/data/schema';
import type { AuditReport } from '@/content/case-study';

type AuditTableProps = { locale: Locale; report: AuditReport };

const COLUMNS = [
  'performance',
  'accessibility',
  'bestPractices',
  'seo',
  'lcp',
  'tbt',
  'cls',
] as const;

/**
 * One stored Lighthouse run as a table (FR-062). Every number comes from the audit file: scores as
 * whole numbers out of 100, LCP in seconds (2 decimals), TBT in milliseconds, CLS to 3 decimals.
 * The region scrolls sideways on a phone; it is focusable and named so a keyboard can scroll it.
 */
export async function AuditTable({ locale, report }: AuditTableProps): Promise<ReactElement> {
  const t = await getTranslations({ locale, namespace: 'caseStudy.performance' });
  const format = await getFormatter({ locale });
  const id = `audit-${report.id}`;

  const { score, seconds, millis, layoutShift } = createAuditFormat(format);

  const date = format.dateTime(new Date(`${report.auditDate}T00:00:00Z`), {
    dateStyle: 'long',
    timeZone: 'UTC',
  });
  const links = await getTranslations({ locale, namespace: 'caseStudy.links' });
  const runLabel = t(`run.${report.id}`);

  return (
    <div className="space-y-3">
      {/* A scrolling region must be keyboard-focusable (axe scrollable-region-focusable); the name comes from the caption. */}
      <div
        role="region"
        aria-labelledby={`${id}-caption`}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="overflow-x-auto rounded-md border border-line"
      >
        <table
          data-testid={id}
          aria-describedby={report.isPreview ? `${id}-note` : undefined}
          className="w-full min-w-[56rem] border-collapse text-start text-small"
        >
          <caption id={`${id}-caption`} className="p-3 text-start text-h3">
            {t('caption', { run: runLabel })}
          </caption>
          <thead className="bg-surface">
            <tr>
              <th scope="col" className="p-3 text-start font-medium">
                {t('columns.page')}
              </th>
              {COLUMNS.map((column) => (
                <th key={column} scope="col" className="p-3 text-start font-medium">
                  {t(`columns.${column}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.routes.map((row) => (
              <tr key={row.route} className="border-t border-line">
                <th scope="row" className="p-3 text-start font-normal">
                  <code>{row.route}</code>
                </th>
                <td className="p-3">{score(row.performance)}</td>
                <td className="p-3">{score(row.accessibility)}</td>
                <td className="p-3">{score(row.bestPractices)}</td>
                <td className="p-3">{score(row.seo)}</td>
                <td className="p-3">{seconds(row.lcpMs)}</td>
                <td className="p-3">{millis(row.tbtMs)}</td>
                <td className="p-3">{layoutShift(row.cls)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-small text-muted">{t('measured', { date, runs: report.runsPerUrl })}</p>
      <AuditNotes locale={locale} report={report} />
      {report.isPreview ? (
        <p id={`${id}-note`} className="text-small text-muted">
          {t('notePreview')}
        </p>
      ) : null}
      <p className="text-small text-muted">
        <ExternalLink href={report.url} newTabLabel={links('newTab')}>
          {t('source', { file: report.file })}
        </ExternalLink>
      </p>
    </div>
  );
}
