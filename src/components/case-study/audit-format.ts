import type { getFormatter } from 'next-intl/server';

import type { AuditMetric } from '@/content/case-study';

type NumberFormatter = Awaited<ReturnType<typeof getFormatter>>;

export type AuditFormat = {
  score: (value: number) => string;
  seconds: (ms: number) => string;
  millis: (ms: number) => string;
  layoutShift: (value: number) => string;
  /** A metric value in the unit the table uses for it. */
  metric: (metric: AuditMetric, value: number) => string;
};

/** Number formats shared by the audit tables and notes: scores /100, LCP s (2 dp), TBT ms, CLS 3 dp. */
export function createAuditFormat(format: NumberFormatter): AuditFormat {
  const score = (value: number): string => format.number(value * 100, { maximumFractionDigits: 0 });
  const seconds = (ms: number): string =>
    format.number(ms / 1000, {
      style: 'unit',
      unit: 'second',
      unitDisplay: 'narrow',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const millis = (ms: number): string =>
    format.number(ms, {
      style: 'unit',
      unit: 'millisecond',
      unitDisplay: 'narrow',
      maximumFractionDigits: 0,
    });
  const layoutShift = (value: number): string =>
    format.number(value, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const metric = (kind: AuditMetric, value: number): string =>
    kind === 'lcp' ? seconds(value) : kind === 'tbt' ? millis(value) : layoutShift(value);
  return { score, seconds, millis, layoutShift, metric };
}
