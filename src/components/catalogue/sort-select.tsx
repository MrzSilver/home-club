'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { ChangeEvent, ReactElement } from 'react';

import { SORTS, type CatalogueSort } from '@/lib/catalogue-query';

type SortSelectProps = {
  value: CatalogueSort;
  onChange: (sort: CatalogueSort) => void;
};

/** Sort order (FR-021): a native select with a visible label, so it works with every input method. */
export function SortSelect({ value, onChange }: SortSelectProps): ReactElement {
  const t = useTranslations('catalogue.sort');
  const id = useId();

  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    const next = SORTS.find((sort) => sort === event.target.value);
    if (next !== undefined) onChange(next);
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <label htmlFor={id} className="shrink-0 text-small text-muted">
        {t('label')}
      </label>
      <select
        id={id}
        value={value}
        onChange={handleChange}
        className="min-h-11 min-w-0 rounded-md border border-field bg-canvas px-3 text-small"
      >
        {SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {t(sort)}
          </option>
        ))}
      </select>
    </div>
  );
}
