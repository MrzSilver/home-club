import type { ReactElement, ReactNode } from 'react';

import type { Locale } from '@/data/schema';

type NativeLabelProps = {
  /** Language the text is written in, which is not necessarily the page language. */
  lang: Locale;
  children: ReactNode;
};

/**
 * Wraps text whose language differs from the page, such as the locale switcher's "ไทย" on an
 * English page or "English" on a Thai page. `lang` makes screen readers pick the right voice and
 * lets the `:lang(th)` typography rules (Thai font, line height, no uppercase or tracking) apply
 * (RULES 6.5, FR-073). The Latin brand lockup does the same through `Wordmark`, which sets lang="en".
 */
export function NativeLabel({ lang, children }: NativeLabelProps): ReactElement {
  return <span lang={lang}>{children}</span>;
}
