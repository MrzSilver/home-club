import { defineRouting } from 'next-intl/routing';

import { LOCALES } from '@/data/locales';
import { DEFAULT_LOCALE } from '@/lib/locale-path';

// One year, in seconds.
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// SPEC 4: prefix always, default `en`. Detection order for a request with no prefix (`/`) is the
// NEXT_LOCALE cookie, then Accept-Language, then the default (next-intl's built-in behaviour).
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
  // hreflang comes from page metadata (public URLs, built from NEXT_PUBLIC_SITE_URL), not from a
  // Link header derived from the request host.
  alternateLinks: false,
  // The language choice is a preference that must outlive the browser session (FR-002), like the
  // currency cookie. next-intl's default is a session cookie. Not personal data. SameSite=Lax, Path=/.
  localeCookie: { maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: 'lax' },
});
