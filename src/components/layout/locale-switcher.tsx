'use client';

import { useId } from 'react';
import type { ReactElement } from 'react';

import { LocaleLinks } from '@/components/ui/locale-links';
import type { Locale } from '@/data/schema';

type LocaleSwitcherProps = {
  /** Visible heading, "Language". */
  label: string;
  /** Each language's name in that language. */
  names: Record<Locale, string>;
  onNavigate?: () => void;
};

/**
 * Language choice (FR-002): real links to the same page in the other locale, current one marked with
 * `aria-current`. Persistence is next-intl's NEXT_LOCALE cookie, which the proxy sets when a locale
 * URL is requested, so `/` later redirects to the last language used.
 */
export function LocaleSwitcher({ label, names, onNavigate }: LocaleSwitcherProps): ReactElement {
  const headingId = useId();

  return (
    <div>
      <p id={headingId} className="text-eyebrow uppercase-latin text-muted">
        {label}
      </p>
      <LocaleLinks
        labels={names}
        labelledBy={headingId}
        className="mt-2"
        {...(onNavigate === undefined ? {} : { onNavigate })}
      />
    </div>
  );
}
