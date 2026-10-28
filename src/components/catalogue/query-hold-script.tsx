'use client';

import { useServerInsertedHTML } from 'next/navigation';
import { useRef } from 'react';
import type { ReactElement } from 'react';

import { HOLD_SCRIPT } from '@/components/catalogue/query-hold';

/**
 * Puts the pre-paint hold script (query-hold.ts) into the server-rendered HTML, and only there.
 * `useServerInsertedHTML` runs while the page is rendered to HTML (here: at build time, since the page
 * is static) and never in the browser. A `<script>` rendered as part of the React tree would be created
 * again on every client-side navigation to the page, where it cannot run and React logs an error in
 * development; a script that exists only in the HTML has nothing to hydrate or to warn about.
 * Next.js calls the callback at every flush of the HTML stream, so it answers once.
 */
export function QueryHoldScript(): ReactElement | null {
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script>{HOLD_SCRIPT}</script>;
  });
  return null;
}
