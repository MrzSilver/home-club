import { createTranslator } from 'next-intl';
import { vi } from 'vitest';

import en from '@messages/en.json';
import th from '@messages/th.json';

// next-intl's server API needs a Next.js request. These translators read the real catalogues, so tests
// still assert the real copy.
export const setRequestLocale = vi.fn();

export const serverIntlModule = {
  getMessages: ({ locale }: { locale: 'en' | 'th' }): Promise<typeof en> =>
    Promise.resolve(locale === 'th' ? th : en),
  setRequestLocale,
  getTranslations: ({
    locale,
    namespace,
  }: {
    locale: 'en' | 'th';
    namespace: string;
  }): Promise<ReturnType<typeof createTranslator>> =>
    Promise.resolve(
      createTranslator({
        locale,
        messages: locale === 'th' ? th : en,
        namespace: namespace as never,
      }),
    ),
};
