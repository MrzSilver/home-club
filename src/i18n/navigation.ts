import { createNavigation } from 'next-intl/navigation';

import { routing } from '@/i18n/routing';
import { stripCurrencySegment } from '@/lib/locale-path';

// The only place components import Link, redirect, usePathname and useRouter from (enforced by
// ESLint): they add the locale prefix, so nothing hand-concatenates `/en/...` (SPEC 4).
// Pathnames passed in and returned are PUBLIC paths; the hidden currency segment never shows here.
const navigation = createNavigation(routing);

export const { Link, redirect, permanentRedirect, useRouter, getPathname } = navigation;

/**
 * Current public pathname without the locale prefix (`/shop`, `/` for the home page).
 *
 * next-intl's own hook is not enough: while a prerendered page is rendered on the server it sees the
 * rewritten internal path (`/usd/shop`), and in the browser the public one (`/shop`), which is a
 * hydration mismatch for anything that renders it (Next.js docs, usePathname). This wrapper strips
 * the currency segment so both sides agree (ADR-0003).
 */
export function usePathname(): string {
  return stripCurrencySegment(navigation.usePathname());
}
