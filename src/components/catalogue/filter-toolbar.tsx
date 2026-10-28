'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement, RefObject } from 'react';

import { SortSelect } from '@/components/catalogue/sort-select';
import { Button } from '@/components/ui/button';
import { FiltersIcon } from '@/components/ui/icons/filters-icon';
import type { CatalogueSort } from '@/lib/catalogue-query';

type FilterToolbarProps = {
  sort: CatalogueSort;
  onSortChange: (sort: CatalogueSort) => void;
  /** How many filters are on; shown on the button. */
  activeCount: number;
  drawerOpen: boolean;
  drawerLoading: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpenDrawer: () => void;
  /** Starts downloading the drawer early (hover, focus, touch). */
  onWarmDrawer: () => void;
};

/**
 * The sort and filter bar (DESIGN 8). Below `lg` it is sticky under the header and holds the
 * "Filters (n)" button that opens the drawer; from `lg` the filters are a sidebar, the button is gone
 * and only the sort select remains, on the right.
 */
export function FilterToolbar({
  sort,
  onSortChange,
  activeCount,
  drawerOpen,
  drawerLoading,
  triggerRef,
  onOpenDrawer,
  onWarmDrawer,
}: FilterToolbarProps): ReactElement {
  const t = useTranslations('catalogue.filters');

  return (
    <div className="sticky top-(--header-height) z-30 -mx-gutter flex items-center justify-between gap-3 border-b border-line bg-canvas px-gutter py-2 lg:static lg:mx-0 lg:justify-end lg:border-0 lg:p-0">
      <Button
        ref={triggerRef}
        variant="secondary"
        size="sm"
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
        aria-busy={drawerLoading ? true : undefined}
        onClick={onOpenDrawer}
        onPointerEnter={onWarmDrawer}
        onFocus={onWarmDrawer}
        onTouchStart={onWarmDrawer}
        data-catalogue-pending=""
        className="shrink-0 px-4 lg:hidden"
      >
        <FiltersIcon className="size-5" />
        {activeCount > 0 ? t('openWithCount', { count: activeCount }) : t('open')}
      </Button>
      <SortSelect value={sort} onChange={onSortChange} />
    </div>
  );
}
