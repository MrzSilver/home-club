import { createFormatter } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { createAuditFormat } from '@/components/case-study/audit-format';

const forLocale = (locale: 'en' | 'th'): ReturnType<typeof createAuditFormat> =>
  createAuditFormat(createFormatter({ locale }));

describe('audit number formats (FR-062)', () => {
  it('shows scores as whole numbers out of 100', () => {
    const f = forLocale('en');
    expect(f.score(0.95)).toBe('95');
    expect(f.score(1)).toBe('100');
    expect(f.score(0.994)).toBe('99');
  });

  it('shows LCP in seconds with two decimals', () => {
    const f = forLocale('en');
    expect(f.seconds(2450.9475)).toMatch(/^2\.45\s?s$/);
    expect(f.seconds(2500)).toMatch(/^2\.50\s?s$/);
  });

  it('shows TBT in whole milliseconds', () => {
    expect(forLocale('en').millis(106.4)).toMatch(/^106\s?ms$/);
  });

  it('shows CLS to three decimals, including zero', () => {
    const f = forLocale('en');
    expect(f.layoutShift(0)).toBe('0.000');
    expect(f.layoutShift(0.0123)).toBe('0.012');
  });

  it('picks the unit by metric so a budget miss reads in the table unit', () => {
    const f = forLocale('en');
    expect(f.metric('lcp', 2513.533)).toBe(f.seconds(2513.533));
    expect(f.metric('tbt', 250)).toBe(f.millis(250));
    expect(f.metric('cls', 0.1)).toBe(f.layoutShift(0.1));
  });

  it('keeps the same precision in Thai', () => {
    const f = forLocale('th');
    expect(f.layoutShift(0.5)).toBe('0.500');
    expect(f.score(0.9)).toBe('90');
    expect(f.seconds(1000)).toMatch(/^1\.00/);
  });
});
