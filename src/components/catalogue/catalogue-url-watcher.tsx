'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactElement } from 'react';

import { notifyUrlChanged } from '@/components/catalogue/use-catalogue-url';

/**
 * Re-reads the URL after Next.js navigations to the SAME collection page (menu "Shop all" from
 * `/shop?color=grey`, a category link from that category's own filtered page). Next commits those with
 * its own `pushState` call, which the History API patch passes through without any event, and the
 * static page segment is kept (no remount), so neither `popstate` nor the island's own event fires and
 * the filters would stay on screen while the URL has none (ADR-0006).
 *
 * `useSearchParams` is the router's own committed-navigation signal: it changes whenever the search
 * string of the committed URL does, and Next commits the URL before effects run, so the effect below
 * sees the new `location.search`. It makes the component that calls it client-rendered up to the
 * nearest Suspense boundary, so this renders nothing and the explorer places it in its own
 * `<Suspense fallback={null}>`: the page stays static and the grid stays in the server HTML.
 */
export function CatalogueUrlWatcher(): ReactElement | null {
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    notifyUrlChanged();
  }, [search]);

  return null;
}
