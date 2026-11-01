'use client';
import { useRef, useState, type ReactElement, type Ref } from 'react';

import { buttonClasses } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/data/schema';
import { searchProducts, type SearchEntry } from '@/lib/search';

export function SearchBox({
  entries,
  locale,
  onNavigate,
  initialQuery = '',
  inputRef,
}: {
  entries: SearchEntry[];
  locale: Locale;
  onNavigate?: () => void;
  initialQuery?: string;
  inputRef?: Ref<HTMLInputElement>;
}): ReactElement {
  const t = useTranslations('search');
  const [query, setQuery] = useState(initialQuery);
  const root = useRef<HTMLDivElement>(null);
  const results = searchProducts(entries, query.slice(0, 200), locale);
  return (
    <div ref={root} className="space-y-6">
      <form action={`/${locale}/search`} method="get" onSubmit={onNavigate}>
        <label className="block space-y-2">
          <span>{t('label')}</span>
          <input
            type="search"
            ref={inputRef}
            name="q"
            value={query}
            maxLength={200}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-12 w-full rounded-md border border-field bg-canvas px-4"
          />
        </label>
        <button type="submit" className="mt-4 min-h-11 rounded-md bg-ink px-6 text-canvas">
          {t('submit')}
        </button>
      </form>
      <p role="status">{query.trim() ? t('count', { count: results.length }) : t('hint')}</p>
      {query.trim() && !results.length ? (
        <div className="space-y-4">
          <p>{t('empty')}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={buttonClasses({ variant: 'secondary' })}
              onClick={() => {
                setQuery('');
                root.current?.querySelector('input')?.focus();
              }}
            >
              {t('clear')}
            </button>
            <Link href="/shop" onClick={onNavigate} className={buttonClasses()}>
              {t('shopAll')}
            </Link>
          </div>
        </div>
      ) : null}
      <ul className="divide-y divide-line">
        {results.map((entry) => (
          <li key={entry.slug}>
            <Link
              href={`/products/${entry.slug}`}
              onClick={onNavigate}
              className="flex min-h-12 flex-wrap items-center justify-between gap-3 py-3"
            >
              <span className="text-h3">{entry.name}</span>
              <span className="text-small text-muted">{entry.categoryName}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
