'use client';
import dynamic from 'next/dynamic';
import { useRef, useState, type ReactElement } from 'react';
import { IconButton } from '@/components/ui/icon-button';
import { SearchIcon } from '@/components/ui/icons/search-icon';
import type { SearchEntry } from '@/lib/search';
import type { Locale } from '@/data/schema';

const SearchDialog = dynamic(
  () => import('@/components/search/search-dialog').then((m) => m.SearchDialog),
  { ssr: false },
);
export function SearchTrigger({
  entries,
  locale,
  messages,
}: {
  entries: SearchEntry[];
  locale: Locale;
  messages: Record<string, string>;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <IconButton
        ref={trigger}
        label={messages.title ?? ''}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="size-6" />
      </IconButton>
      {open ? (
        <SearchDialog
          entries={entries}
          locale={locale}
          messages={messages}
          onClose={() => setOpen(false)}
          returnFocus={trigger}
        />
      ) : null}
    </>
  );
}
