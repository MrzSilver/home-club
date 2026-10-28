'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import type { Category, Color } from '@/data/schema';
import {
  parseQuerySearch,
  serializeCatalogueQuery,
  withCategory,
  type CatalogueQuery,
} from '@/lib/catalogue-query';
import type { Currency } from '@/lib/money';

// The collection pages are static (ADR-0006), so the query string is read in the browser. The server
// snapshot is the empty string: the HTML always holds the default view, and the first client render
// repeats it before React switches to the real URL, which keeps hydration exact.
const URL_EVENT = 'hc:catalogue-url';

/** Tells the store that the URL may have changed behind its back; it re-reads `location.search`. */
export function notifyUrlChanged(): void {
  window.dispatchEvent(new Event(URL_EVENT));
}

function subscribe(onChange: () => void): () => void {
  // popstate: Back / Forward. URL_EVENT: our own replaceState calls and Next.js navigations (see
  // `CatalogueUrlWatcher`), which fire nothing by themselves.
  window.addEventListener('popstate', onChange);
  window.addEventListener(URL_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(URL_EVENT, onChange);
  };
}

const getSnapshot = (): string => window.location.search;
const getServerSnapshot = (): string => '';

/** Replaces the query string of the current page, keeping its path and hash; adds no history entry. */
function replaceSearch(search: string): void {
  const { pathname, hash } = window.location;
  // Next.js integrates the native History API (it keeps its router state and `useSearchParams` in
  // step), so this needs no round trip to the server for a list that is already in the page.
  window.history.replaceState(null, '', `${pathname}${search === '' ? '' : `?${search}`}${hash}`);
  notifyUrlChanged();
}

type CatalogueUrl = {
  /** The query in the URL, price bounds in the active currency, category stripped on a category page. */
  query: CatalogueQuery;
  /**
   * Writes a changed query to the URL (replace, not push). The change is applied to the query as it is
   * in the live URL at that moment, so a debounced price edit cannot undo a colour toggled meanwhile.
   */
  update: (change: (current: CatalogueQuery) => CatalogueQuery) => void;
};

/**
 * The collection's filter state, kept in the URL (FR-021): `query` is parsed from `location.search`
 * on every change (including Back / Forward) and `update` writes it back. `scope` is the category of
 * a category page, where `?category=` means nothing and is neither read nor written.
 */
export function useCatalogueUrl(
  currency: Currency,
  colors: readonly Color[],
  scope: Category | null,
): CatalogueUrl {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const known = useMemo(() => new Set(colors.map((color) => color.id)), [colors]);

  const parse = useCallback(
    (value: string): CatalogueQuery => {
      const parsed = parseQuerySearch(value, currency, known);
      return scope === null ? parsed : withCategory(parsed, undefined);
    },
    [currency, known, scope],
  );

  const query = useMemo(() => parse(search), [parse, search]);

  const update = useCallback(
    (change: (current: CatalogueQuery) => CatalogueQuery): void => {
      const next = change(parse(window.location.search));
      const written = serializeCatalogueQuery(
        scope === null ? next : withCategory(next, undefined),
        currency,
      );
      if (written !== window.location.search.replace(/^\?/, '')) replaceSearch(written);
    },
    [parse, currency, scope],
  );

  return { query, update };
}
