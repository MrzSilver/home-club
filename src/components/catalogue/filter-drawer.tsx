'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { ReactElement, ReactNode, RefObject } from 'react';

import { Button } from '@/components/ui/button';
import { CloseIcon } from '@/components/ui/icons/close-icon';
import { IconButton } from '@/components/ui/icon-button';

export type FilterDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  closeLabel: string;
  /** "Show 7 results": closes the drawer, since filters apply as they are chosen. */
  showLabel: string;
  clearLabel: string;
  canClear: boolean;
  onClear: () => void;
  /** The Filters button: focus goes back to it on close (Safari does not focus buttons on click). */
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  children: ReactNode;
};

/**
 * The filters drawer for screens below lg (ADR-0005: Radix Dialog gives the focus trap, Esc, inert
 * background and focus return). Loaded on demand by `CatalogueExplorer`, so the dialog code stays
 * off the first-load path. Filters apply live as they are chosen; the footer button only closes.
 */
export function FilterDrawer({
  open,
  onOpenChange,
  title,
  closeLabel,
  showLabel,
  clearLabel,
  canClear,
  onClear,
  returnFocusRef,
  children,
}: FilterDrawerProps): ReactElement {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          aria-modal="true"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
          className="drawer-panel-start fixed inset-y-0 start-0 z-50 flex w-full max-w-96 flex-col bg-canvas text-ink shadow-float"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line ps-4 pe-2">
            <Dialog.Title className="text-eyebrow uppercase-latin">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton label={closeLabel}>
                <CloseIcon className="size-6" />
              </IconButton>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-4">{children}</div>

          <div className="flex shrink-0 gap-3 border-t border-line p-4">
            {canClear ? (
              <Button
                variant="secondary"
                onClick={onClear}
                className="shrink-0 whitespace-nowrap px-4"
              >
                {clearLabel}
              </Button>
            ) : null}
            <Dialog.Close asChild>
              <Button className="flex-1">{showLabel}</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
