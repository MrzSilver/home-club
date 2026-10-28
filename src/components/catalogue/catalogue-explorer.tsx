'use client';

import { useTranslations } from 'next-intl';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { CatalogueUrlWatcher } from '@/components/catalogue/catalogue-url-watcher';
import { CatalogueResults } from '@/components/catalogue/catalogue-results';
import { FilterChips } from '@/components/catalogue/filter-chips';
import { FilterPanel, type CategoryOption } from '@/components/catalogue/filter-panel';
import { HOLD_STYLE_ID } from '@/components/catalogue/query-hold';
import { FilterToolbar } from '@/components/catalogue/filter-toolbar';
import { useCatalogueUrl } from '@/components/catalogue/use-catalogue-url';
import { useFilterDrawer } from '@/components/catalogue/use-filter-drawer';
import type { Category, Color } from '@/data/schema';
import {
  activeFilterCount,
  applyQuery,
  clearFilters,
  computeFacets,
  withSort,
  type CatalogueItem,
} from '@/lib/catalogue-query';
import type { Currency } from '@/lib/money';

type CatalogueExplorerProps = {
  /** The category of a category page, or null on "Shop all". */
  scope: Category | null;
  currency: Currency;
  /** The currency's sign as the page language writes it, from the server (Intl differs between Node and browsers). */
  currencySymbol: string;
  /** The products of this page, in data order, as the plain data the filters need. */
  items: readonly CatalogueItem[];
  /** One server-rendered `ProductCard` per item slug: the explorer orders and filters them. */
  cards: Readonly<Record<string, ReactNode>>;
  /** Every colour in the catalogue: resolves ids from the URL to names and swatches. */
  colors: readonly Color[];
  categories: readonly CategoryOption[];
};

/**
 * The interactive part of the collection pages (FR-020, FR-021, ADR-0006): sort, filters, chips,
 * result count and the grid. The page is static; this island reads the query string in the browser,
 * filters the short list it was given with the pure functions of `lib/catalogue-query`, and writes
 * changes back to the URL. The server HTML is the default view (all products, featured order).
 */
export function CatalogueExplorer({
  scope,
  currency,
  currencySymbol,
  items,
  cards,
  colors,
  categories,
}: CatalogueExplorerProps): ReactElement {
  const t = useTranslations('catalogue');
  const { query, update } = useCatalogueUrl(currency, colors, scope);
  const countRef = useRef<HTMLParagraphElement>(null);
  const { Drawer, open, setOpen, loading, triggerRef, openDrawer, warm } = useFilterDrawer();
  // Bumped by "Clear all" so the price fields drop a draft that was never written to the URL.
  const [resetCount, setResetCount] = useState(0);

  const visible = useMemo(() => applyQuery(items, query, currency), [items, query, currency]);
  const facets = useMemo(
    () => computeFacets(items, currency, query, colors),
    [items, currency, query, colors],
  );
  const showCategory = scope === null;
  const activeCount = activeFilterCount(query, !showCategory);

  // The results area was held back before first paint if the URL had a query (query-hold.ts).
  useEffect(() => {
    document.getElementById(HOLD_STYLE_ID)?.remove();
  }, []);

  function clearAll(): void {
    update(clearFilters);
    setResetCount((count) => count + 1);
  }

  // The empty state's button is about to disappear: keep focus on the page instead of the body.
  function clearAndFocus(): void {
    clearAll();
    countRef.current?.focus();
  }

  const panel = (
    <FilterPanel
      key={resetCount}
      query={query}
      facets={facets}
      currency={currency}
      currencySymbol={currencySymbol}
      categories={categories}
      showCategory={showCategory}
      onChange={update}
    />
  );

  return (
    <div className="mt-6 lg:flex lg:items-start lg:gap-8">
      <Suspense fallback={null}>
        <CatalogueUrlWatcher />
      </Suspense>
      <aside aria-labelledby="filters-heading" className="hidden w-56 shrink-0 lg:block">
        <h2 id="filters-heading" className="mb-4 text-eyebrow uppercase-latin">
          {t('filters.title')}
        </h2>
        {panel}
      </aside>

      <div className="min-w-0 flex-1">
        <FilterToolbar
          sort={query.sort}
          onSortChange={(sort) => update((current) => withSort(current, sort))}
          activeCount={activeCount}
          drawerOpen={open}
          drawerLoading={loading}
          triggerRef={triggerRef}
          onOpenDrawer={() => void openDrawer()}
          onWarmDrawer={warm}
        />

        <p
          ref={countRef}
          data-testid="result-count"
          data-catalogue-pending=""
          role="status"
          tabIndex={-1}
          className="mt-4 text-small text-muted"
        >
          {t('count', { count: visible.length })}
        </p>

        <FilterChips
          query={query}
          currency={currency}
          colors={colors}
          categories={categories}
          showCategory={showCategory}
          onChange={update}
          onClear={clearAll}
          fallbackRef={countRef}
        />

        <CatalogueResults visible={visible} cards={cards} onClear={clearAndFocus} />
      </div>

      {Drawer === null ? null : (
        <Drawer
          open={open}
          onOpenChange={setOpen}
          title={t('filters.title')}
          closeLabel={t('filters.close')}
          showLabel={t('filters.showResults', { count: visible.length })}
          clearLabel={t('filters.clearAll')}
          canClear={activeCount > 0}
          onClear={clearAll}
          returnFocusRef={triggerRef}
        >
          {panel}
        </Drawer>
      )}
    </div>
  );
}
