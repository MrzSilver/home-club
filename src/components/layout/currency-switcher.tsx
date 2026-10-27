'use client';

import { useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import { useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';

import { CheckIcon } from '@/components/ui/icons/check-icon';
import { useRouter } from '@/i18n/navigation';
import {
  buildCurrencyCookie,
  CURRENCIES,
  defaultCurrencyFor,
  segmentToCurrency,
} from '@/lib/currency';
import type { Currency } from '@/lib/money';

type CurrencySwitcherProps = {
  /** Legend of the radio group, "Currency". */
  label: string;
  /** Name of each currency ("US dollar (USD)"). */
  names: Record<Currency, string>;
  /** Sentence announced after a change, one per currency. */
  announcements: Record<Currency, string>;
};

/**
 * Currency choice (FR-002): writes `hc_currency` and refreshes the route. The proxy then serves the
 * other prerendered variant of the same public URL (ADR-0003), so prices change in place without a
 * full reload. The current value comes from the route's hidden `[currency]` segment through
 * `useParams`, which is identical on the server and in the browser, so there is no hydration
 * mismatch. Radios are real inputs: arrow keys, labels and group semantics come from the platform.
 */
export function CurrencySwitcher({
  label,
  names,
  announcements,
}: CurrencySwitcherProps): ReactElement {
  const locale = useLocale();
  const params = useParams<{ currency?: string }>();
  const router = useRouter();
  // Unique per switcher: another radio group on the page (T08 filters) must not merge with this one.
  const groupName = useId();
  const routeCurrency = segmentToCurrency(params.currency);
  // Optimistic: the radio moves at once, the route catches up when the refresh lands.
  const [chosen, setChosen] = useState<Currency | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const fallback = defaultCurrencyFor(locale === 'th' ? 'th' : 'en');
  const current = chosen ?? routeCurrency ?? fallback;

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const next = CURRENCIES.find((currency) => currency === event.target.value);
    if (next === undefined || next === current) return;
    // Not personal data: a one-year preference cookie read by the proxy (SPEC 6).
    document.cookie = buildCurrencyCookie(next, {
      secure: window.location.protocol === 'https:',
    });
    setChosen(next);
    setAnnouncement(announcements[next]);
    router.refresh();
  }

  return (
    <fieldset>
      <legend className="text-eyebrow uppercase-latin text-muted">{label}</legend>
      <div className="mt-2 grid gap-2">
        {CURRENCIES.map((currency) => (
          <label
            key={currency}
            className="focus-ring-within relative flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-field px-3 text-small has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-canvas"
          >
            <input
              type="radio"
              name={groupName}
              value={currency}
              checked={current === currency}
              onChange={handleChange}
              className="peer sr-only"
            />
            <CheckIcon className="hidden size-4 shrink-0 peer-checked:block" />
            <span>{names[currency]}</span>
          </label>
        ))}
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </fieldset>
  );
}
