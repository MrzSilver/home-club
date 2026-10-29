'use client';
import { Suspense, type ReactElement } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchBox } from '@/components/search/search-box';
import type { SearchEntry } from '@/lib/search';
import type { Locale } from '@/data/schema';
import { parseSearchQuery } from '@/lib/search-query';

function SearchQuery(props: { entries: SearchEntry[]; locale: Locale }): ReactElement {
  const params = useSearchParams();
  const query = parseSearchQuery(params.get('q') ?? '');
  return <SearchBox key={query} {...props} initialQuery={query} />;
}
export function SearchPage(props: { entries: SearchEntry[]; locale: Locale }): ReactElement {
  return (
    <Suspense>
      <SearchQuery {...props} />
    </Suspense>
  );
}
