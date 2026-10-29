'use client';
import { useState, type ReactElement } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/data/schema';

const ROWS = [
  { size: 'S', chest: 92, waist: 76 },
  { size: 'M', chest: 100, waist: 84 },
  { size: 'L', chest: 108, waist: 92 },
  { size: 'XL', chest: 116, waist: 100 },
];

export function SizeGuide({ locale }: { locale: Locale }): ReactElement {
  const t = useTranslations('sizeGuide');
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');
  const number = (cm: number): string =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
      unit === 'cm' ? cm : cm / 2.54,
    );
  return (
    <details className="rounded-md border border-line p-6">
      <summary className="flex min-h-11 cursor-pointer items-center text-h3">{t('title')}</summary>
      <div className="mt-4 space-y-4">
        <p>{t('demo')}</p>
        <div role="group" aria-label={t('units')} className="flex gap-3">
          {(['cm', 'in'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={unit === value}
              onClick={() => setUnit(value)}
              className="min-h-11 min-w-11 rounded-sm border border-field px-4 aria-pressed:bg-ink aria-pressed:text-canvas"
            >
              {t(value)}
            </button>
          ))}
        </div>
        <table className="w-full text-start">
          <caption className="mb-3 text-start">{t('caption', { unit: t(unit) })}</caption>
          <thead>
            <tr>
              <th scope="col" className="p-3 text-start">
                {t('size')}
              </th>
              <th scope="col" className="p-3 text-start">
                {t('chest')}
              </th>
              <th scope="col" className="p-3 text-start">
                {t('waist')}
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.size} className="border-t border-line">
                <th scope="row" className="p-3 text-start">
                  {row.size}
                </th>
                <td className="p-3">{number(row.chest)}</td>
                <td className="p-3">{number(row.waist)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
