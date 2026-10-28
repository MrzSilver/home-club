'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { PriceFields } from '@/components/catalogue/price-fields';
import { CheckIcon } from '@/components/ui/icons/check-icon';
import { Swatch } from '@/components/ui/swatch';
import type { Category, Locale, Size } from '@/data/schema';
import {
  toggleColor,
  toggleSize,
  withCategory,
  type CatalogueFacets,
  type CatalogueQuery,
} from '@/lib/catalogue-query';
import type { Currency } from '@/lib/money';

export type CategoryOption = { id: Category; name: string };

type FilterPanelProps = {
  query: CatalogueQuery;
  facets: CatalogueFacets;
  currency: Currency;
  /** Shown in the price legend instead of the ISO code ("$", "฿"). */
  currencySymbol: string;
  /** Every category, named in the page language; the group is shown on "Shop all" only. */
  categories: readonly CategoryOption[];
  /** True on "Shop all", where the category is a filter; a category page has it as its subject. */
  showCategory: boolean;
  onChange: (change: (current: CatalogueQuery) => CatalogueQuery) => void;
};

function Group({ legend, children }: { legend: string; children: ReactNode }): ReactElement {
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="mb-2 p-0 text-eyebrow uppercase-latin text-muted">{legend}</legend>
      {children}
    </fieldset>
  );
}

const ROW =
  'focus-ring-within flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 text-body hover:bg-surface';

/**
 * The filter controls (FR-021): category (Shop all only), colour, size, price. Every group is a
 * fieldset with a visible legend; colour is a swatch plus its name, so colour is never the only
 * signal, and a selected size shows a check as well as the inverted fill. The same panel sits in the
 * sidebar (from lg) and in the drawer, so it holds no layout of its own.
 */
export function FilterPanel({
  query,
  facets,
  currency,
  currencySymbol,
  categories,
  showCategory,
  onChange,
}: FilterPanelProps): ReactElement {
  const t = useTranslations('catalogue.filters');
  const locale = useLocale() as Locale;
  const name = useId();

  return (
    <div className="space-y-6">
      {showCategory ? (
        <Group legend={t('category.legend')}>
          <ul>
            {[{ id: undefined, name: t('category.all') }, ...categories].map((category) => (
              <li key={category.id ?? 'all'}>
                <label className={ROW}>
                  <input
                    type="radio"
                    name={`${name}-category`}
                    checked={query.category === category.id}
                    onChange={() => onChange((current) => withCategory(current, category.id))}
                    className="size-5 shrink-0 accent-ink"
                  />
                  {category.name}
                </label>
              </li>
            ))}
          </ul>
        </Group>
      ) : null}

      <Group legend={t('color.legend')}>
        <ul>
          {facets.colors.map((color) => (
            <li key={color.id}>
              <label className={ROW}>
                <input
                  type="checkbox"
                  checked={query.color.includes(color.id)}
                  onChange={() => onChange((current) => toggleColor(current, color.id))}
                  className="size-5 shrink-0 accent-ink"
                />
                <Swatch color={color.hex} />
                {color.name[locale]}
              </label>
            </li>
          ))}
        </ul>
      </Group>

      <Group legend={t('size.legend')}>
        <ul className="flex flex-wrap gap-2">
          {facets.sizes.map((size: Size) => (
            <li key={size}>
              <label className="focus-ring-within relative flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-md border border-field px-3 text-small hover:bg-surface has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-canvas">
                <input
                  type="checkbox"
                  checked={query.size.includes(size)}
                  onChange={() => onChange((current) => toggleSize(current, size))}
                  className="peer sr-only"
                />
                <CheckIcon className="hidden size-4 shrink-0 peer-checked:block" />
                {size === 'ONE' ? t('size.one') : size}
              </label>
            </li>
          ))}
        </ul>
      </Group>

      <Group legend={t('price.legend', { currency: currencySymbol })}>
        <PriceFields
          query={query}
          currency={currency}
          range={facets.priceRange}
          onChange={onChange}
        />
      </Group>
    </div>
  );
}
