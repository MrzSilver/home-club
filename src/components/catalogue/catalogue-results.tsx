'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import type { CatalogueItem } from '@/lib/catalogue-query';

type CatalogueResultsProps = {
  visible: readonly CatalogueItem[];
  cards: Readonly<Record<string, ReactNode>>;
  /** Clears every filter; the empty state's primary action. */
  onClear: () => void;
};

/**
 * The grid of server-rendered cards (2-up, 3-up from md, 4-up from xl), or the empty state when no
 * product matches (SPEC 13a): a heading, one sentence and a primary "Clear filters" action. The
 * wrapper carries `data-catalogue-pending`, the attribute the pre-paint hold hides (query-hold.ts).
 */
export function CatalogueResults({ visible, cards, onClear }: CatalogueResultsProps): ReactElement {
  const t = useTranslations('catalogue');

  return (
    <div data-catalogue-pending="" className="mt-6">
      {visible.length === 0 ? (
        <div className="py-12 text-center">
          <h2 className="text-h2 uppercase-latin">{t('empty.title')}</h2>
          <p className="mx-auto mt-3 max-w-prose text-body text-muted">{t('empty.body')}</p>
          <Button className="mt-6" onClick={onClear}>
            {t('empty.action')}
          </Button>
        </div>
      ) : (
        <>
          <h2 className="sr-only">{t('page.resultsHeading')}</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
            {visible.map((item) => (
              <li key={item.slug}>{cards[item.slug]}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
