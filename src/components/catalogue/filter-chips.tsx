'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useLayoutEffect, useRef } from 'react';
import type { ReactElement, RefObject } from 'react';

import { CloseIcon } from '@/components/ui/icons/close-icon';
import { Swatch } from '@/components/ui/swatch';
import type { Color, Locale } from '@/data/schema';
import {
  toggleColor,
  toggleSize,
  withCategory,
  withPriceBounds,
  type CatalogueQuery,
} from '@/lib/catalogue-query';
import { formatMoney, wholeUnitsToMinor, type Currency } from '@/lib/money';
import type { CategoryOption } from '@/components/catalogue/filter-panel';

type FilterChipsProps = {
  query: CatalogueQuery;
  currency: Currency;
  /** Colours that can be named: the catalogue's colours, so a chip exists even with no match. */
  colors: readonly Color[];
  categories: readonly CategoryOption[];
  /** True when the category is a filter ("Shop all"); false on a category page. */
  showCategory: boolean;
  onChange: (change: (current: CatalogueQuery) => CatalogueQuery) => void;
  onClear: () => void;
  /** Where focus goes when the chip that had it (and every other) is gone. */
  fallbackRef: RefObject<HTMLElement | null>;
};

type Chip = {
  key: string;
  label: string;
  swatch?: string;
  remove: (current: CatalogueQuery) => CatalogueQuery;
};

/**
 * Removable chips for every active filter, plus "Clear all" (FR-021). Chips come from the query, not
 * from the facets, so a filter that matches nothing still has its chip. Removing a chip keeps focus
 * in the list (on the chip that took its place, or the previous one) and, when the last one goes, on
 * the result count, so a keyboard user never lands on the page body.
 */
export function FilterChips({
  query,
  currency,
  colors,
  categories,
  showCategory,
  onChange,
  onClear,
  fallbackRef,
}: FilterChipsProps): ReactElement | null {
  const t = useTranslations('catalogue.filters');
  const locale = useLocale() as Locale;
  const listRef = useRef<HTMLUListElement>(null);
  const removedIndex = useRef<number | null>(null);

  const chips: Chip[] = [];
  const category = categories.find((option) => option.id === query.category);
  if (showCategory && category !== undefined) {
    chips.push({
      key: `category:${category.id}`,
      label: category.name,
      remove: (current) => withCategory(current, undefined),
    });
  }
  for (const id of query.color) {
    const color = colors.find((candidate) => candidate.id === id);
    if (color === undefined) continue;
    chips.push({
      key: `color:${id}`,
      label: color.name[locale],
      swatch: color.hex,
      remove: (current) => toggleColor(current, id),
    });
  }
  for (const size of query.size) {
    chips.push({
      key: `size:${size}`,
      label: size === 'ONE' ? t('size.one') : size,
      remove: (current) => toggleSize(current, size),
    });
  }
  const { minPrice, maxPrice } = query;
  if (minPrice !== undefined || maxPrice !== undefined) {
    const money = (units: number): string =>
      formatMoney(wholeUnitsToMinor(units), currency, locale);
    chips.push({
      key: 'price',
      label:
        minPrice !== undefined && maxPrice !== undefined
          ? t('chip.priceBetween', { min: money(minPrice), max: money(maxPrice) })
          : minPrice !== undefined
            ? t('chip.priceFrom', { min: money(minPrice) })
            : t('chip.priceUpTo', { max: money(maxPrice ?? 0) }),
      remove: (current) => withPriceBounds(current, { min: undefined, max: undefined }),
    });
  }

  const signature = chips.map((chip) => chip.key).join('|');
  useLayoutEffect(() => {
    const index = removedIndex.current;
    if (index === null) return;
    removedIndex.current = null;
    const buttons = listRef.current?.querySelectorAll('button') ?? [];
    const target = buttons[Math.min(index, buttons.length - 1)];
    (target ?? fallbackRef.current)?.focus();
  }, [signature, fallbackRef]);

  if (chips.length === 0) return null;

  return (
    <div data-catalogue-pending="" className="mt-3 flex flex-wrap items-center gap-2">
      <ul ref={listRef} aria-label={t('activeLabel')} className="flex flex-wrap gap-2">
        {chips.map((chip, index) => (
          <li key={chip.key}>
            <button
              type="button"
              aria-label={t('remove', { name: chip.label })}
              onClick={() => {
                removedIndex.current = index;
                onChange(chip.remove);
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink px-3 text-small hover:bg-surface"
            >
              {chip.swatch === undefined ? null : <Swatch color={chip.swatch} />}
              <span>{chip.label}</span>
              <CloseIcon className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          removedIndex.current = 0;
          onClear();
        }}
        className="inline-flex min-h-11 items-center px-2 text-small underline underline-offset-4 hover:decoration-2"
      >
        {t('clearAll')}
      </button>
    </div>
  );
}
