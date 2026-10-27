import type en from '@messages/en.json';

import type { Locale } from '@/data/schema';

// Types every translator call from the English catalogue: `t('nope')` fails typecheck, and the
// parity test (tests/unit/i18n/parity.test.ts) keeps th.json on the same keys (SPEC 4).
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof en;
  }
}
