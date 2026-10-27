'use client';

import { useLocale } from 'next-intl';
import type { MouseEvent, ReactElement } from 'react';

import { NativeLabel } from '@/components/ui/native-label';
import { LOCALES } from '@/data/locales';
import type { Locale } from '@/data/schema';
import { Link, usePathname, useRouter } from '@/i18n/navigation';

type LocaleLinksProps = {
  /** Each language's name in that language ("English", "ไทย"); the caller owns the copy (RULES 6.1). */
  labels: Record<Locale, string>;
  /** Id of the element that names this list (for example a visible "Language" heading). */
  labelledBy?: string;
  /** Called when a link is activated, so a drawer around the list can close itself. */
  onNavigate?: () => void;
  className?: string;
};

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return !(event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
}

/**
 * Links to the current page in every locale (SPEC 4: switching locale = same public path under the
 * other locale). A client island because it reads the pathname. The pathname comes from
 * `@/i18n/navigation`, which hides the currency segment, so the server HTML and the browser agree
 * and no hydration mismatch is raised (ADR-0003).
 *
 * The href has no query string: reading it during render would need `useSearchParams`, which pushes
 * the whole static page out to client rendering. A plain click adds the live query string when there
 * is one, so filters survive the switch; modified clicks and no-JS use the bare path.
 */
export function LocaleLinks({
  labels,
  labelledBy,
  onNavigate,
  className,
}: LocaleLinksProps): ReactElement {
  const pathname = usePathname();
  const current = useLocale();
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>, code: Locale): void {
    onNavigate?.();
    const search = window.location.search;
    if (search === '' || !isPlainLeftClick(event) || event.defaultPrevented) return;
    event.preventDefault();
    router.push(`${pathname}${search}`, { locale: code });
  }

  return (
    <ul
      aria-labelledby={labelledBy}
      className={['flex gap-2', className].filter(Boolean).join(' ')}
    >
      {LOCALES.map((code) => (
        <li key={code}>
          <Link
            href={pathname}
            locale={code}
            // Switching language is rare; skip the viewport prefetch so it adds no work at load.
            prefetch={false}
            lang={code}
            aria-current={code === current ? 'true' : undefined}
            onClick={(event) => handleClick(event, code)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-field px-4 text-body hover:bg-surface aria-[current=true]:border-ink aria-[current=true]:bg-ink aria-[current=true]:text-canvas"
          >
            <NativeLabel lang={code}>{labels[code]}</NativeLabel>
          </Link>
        </li>
      ))}
    </ul>
  );
}
