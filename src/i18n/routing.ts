import { defineRouting } from 'next-intl/routing';

import { LOCALES } from '@/data/locales';
import { DEFAULT_LOCALE } from '@/lib/locale-path';

// SPEC 4: prefix always, default `en`. Detection order for a request with no prefix (`/`) is the
// NEXT_LOCALE cookie, then Accept-Language, then the default (next-intl's built-in behaviour).
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
  // hreflang comes from page metadata (public URLs, built from NEXT_PUBLIC_SITE_URL), not from a
  // Link header derived from the request host.
  alternateLinks: false,
});
