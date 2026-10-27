import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { routing } from '@/i18n/routing';

// Loads the catalogue for the request. Pages call setRequestLocale() first so this stays static;
// an unknown value falls back to the default locale (the layouts answer with notFound() before any
// page renders).
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const messages = (await import(`@messages/${locale}.json`)) as { default: object };
  return { locale, messages: messages.default };
});
