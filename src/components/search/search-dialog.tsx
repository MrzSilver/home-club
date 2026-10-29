'use client';
import * as Dialog from '@radix-ui/react-dialog';
import type { ReactElement, RefObject } from 'react';
import { useRef } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { SearchBox } from '@/components/search/search-box';
import type { SearchEntry } from '@/lib/search';
import type { Locale } from '@/data/schema';

export function SearchDialog({
  entries,
  locale,
  messages,
  onClose,
  returnFocus,
}: {
  entries: SearchEntry[];
  locale: Locale;
  messages: Record<string, string>;
  onClose: () => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
          className="fixed inset-x-0 top-0 z-50 max-h-screen overflow-y-auto rounded-b-md bg-canvas p-6 text-ink shadow-float md:p-12"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <Dialog.Title className="text-h2">{messages.title}</Dialog.Title>
            <Dialog.Close className="min-h-11 min-w-11 rounded-md border border-field px-4">
              {messages.close}
            </Dialog.Close>
          </div>
          <NextIntlClientProvider locale={locale} messages={{ search: messages }}>
            <SearchBox entries={entries} locale={locale} onNavigate={onClose} inputRef={inputRef} />
          </NextIntlClientProvider>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
