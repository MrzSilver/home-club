'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent, ReactElement } from 'react';

import { InfoIcon } from '@/components/ui/icons/info-icon';
import { MAX_PRICE_UNITS, withPriceBounds, type CatalogueQuery } from '@/lib/catalogue-query';
import type { Currency } from '@/lib/money';

/** How long typing pauses before the price range is written to the URL (FR-021). */
export const PRICE_DEBOUNCE_MS = 300;

const MAX_DIGITS = 7;

type Bound = 'min' | 'max';
type Texts = Record<Bound, string>;
/** What the visitor typed, and the URL range it was typed against (`urlKey`). */
type Draft = { base: string; texts: Texts };

const toBound = (text: string, currency: Currency): number | undefined =>
  text === '' ? undefined : Math.min(Number(text), MAX_PRICE_UNITS[currency]);

type PriceFieldsProps = {
  query: CatalogueQuery;
  currency: Currency;
  /** Cheapest and dearest price in the list, whole units; shown as placeholders. */
  range: { min: number; max: number } | null;
  onChange: (change: (current: CatalogueQuery) => CatalogueQuery) => void;
};

/**
 * Min / max price in whole units of the active currency (FR-021), two labelled text inputs rather
 * than a slider: they are keyboard- and screen-reader-friendly by default and cost no script.
 * Typing is debounced; blur and Enter apply at once. A draft is only valid for the URL range it was
 * typed against, so when the URL changes by other means (a chip removed, Clear all, Back) the fields
 * show the URL again without any effect or mirrored state. A range with min > max is not written to
 * the URL; the fields keep what was typed and say why. A parent that wants a hard reset (Clear all
 * while such a draft is showing) remounts the component with a new `key`.
 */
export function PriceFields({ query, currency, range, onChange }: PriceFieldsProps): ReactElement {
  const t = useTranslations('catalogue.filters.price');
  const id = useId();
  const [draft, setDraft] = useState<Draft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Texts | null>(null);

  const urlKey = `${query.minPrice ?? ''}-${query.maxPrice ?? ''}`;
  const texts: Texts =
    draft !== null && draft.base === urlKey
      ? draft.texts
      : { min: String(query.minPrice ?? ''), max: String(query.maxPrice ?? '') };

  const min = toBound(texts.min, currency);
  const max = toBound(texts.max, currency);
  const invalid = min !== undefined && max !== undefined && min > max;
  const errorId = `${id}-error`;

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  function commit(next: Texts): void {
    pending.current = null;
    const nextMin = toBound(next.min, currency);
    const nextMax = toBound(next.max, currency);
    if (nextMin !== undefined && nextMax !== undefined && nextMin > nextMax) return;
    // Written: from now on the URL is the truth. A kept draft could come back to life later, when the
    // URL returns to the range it was typed against (for example after the price chip is removed).
    setDraft(null);
    onChange((current) => withPriceBounds(current, { min: nextMin, max: nextMax }));
  }

  function flush(): void {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current !== null) commit(pending.current);
  }

  function handleChange(bound: Bound, event: ChangeEvent<HTMLInputElement>): void {
    const text = event.target.value.replace(/\D/g, '').slice(0, MAX_DIGITS);
    const next: Texts = { ...texts, [bound]: text };
    setDraft({ base: urlKey, texts: next });
    pending.current = next;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      commit(next);
    }, PRICE_DEBOUNCE_MS);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      flush();
    }
  }

  const field = (bound: Bound, placeholder: number | undefined): ReactElement => (
    <div className="min-w-0 flex-1">
      <label htmlFor={`${id}-${bound}`} className="block text-small text-muted">
        {t(bound)}
      </label>
      <input
        id={`${id}-${bound}`}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={texts[bound]}
        placeholder={placeholder === undefined ? undefined : String(placeholder)}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(event) => handleChange(bound, event)}
        onBlur={flush}
        onKeyDown={handleKeyDown}
        className="mt-1 block min-h-11 w-full rounded-md border border-field bg-canvas px-3 text-body aria-invalid:border-danger"
      />
    </div>
  );

  return (
    <div>
      <div className="flex items-end gap-3">
        {field('min', range?.min)}
        <span aria-hidden="true" className="pb-3 text-muted">
          –
        </span>
        {field('max', range?.max)}
      </div>
      {invalid ? (
        <p id={errorId} role="alert" className="mt-2 flex items-start gap-2 text-small text-danger">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          {t('error')}
        </p>
      ) : null}
    </div>
  );
}
