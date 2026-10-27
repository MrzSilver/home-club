'use client';

import { useLocale } from 'next-intl';
import type { ReactElement } from 'react';

import { NativeLabel } from '@/components/ui/native-label';
import { LOCALES } from '@/data/locales';
import type { Locale } from '@/data/schema';
import { Link, usePathname } from '@/i18n/navigation';

type LocaleLinksProps = {
  /** Each language's name in that language ("English", "ไทย"); the caller owns the copy (RULES 6.1). */
  labels: Record<Locale, string>;
};

/**
 * Links to the current page in every locale (SPEC 4: switching locale = same public path under the
 * other locale). A client island because it reads the pathname. The pathname comes from
 * `@/i18n/navigation`, which hides the currency segment, so the server HTML and the browser agree
 * and no hydration mismatch is raised (ADR-0003). T06's LocaleSwitcher builds on this pattern.
 */
export function LocaleLinks({ labels }: LocaleLinksProps): ReactElement {
  const pathname = usePathname();
  const current = useLocale();

  return (
    <ul className="mt-1 flex gap-4 text-body">
      {LOCALES.map((code) => (
        <li key={code}>
          <Link
            href={pathname}
            locale={code}
            // Switching language is rare; skip the viewport prefetch so it adds no work at load.
            prefetch={false}
            lang={code}
            aria-current={code === current ? 'true' : undefined}
            className="underline-offset-4 hover:underline aria-[current=true]:font-semibold"
          >
            <NativeLabel lang={code}>{labels[code]}</NativeLabel>
          </Link>
        </li>
      ))}
    </ul>
  );
}
