'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import type { ReactElement, RefObject } from 'react';
import { CartContents } from '@/components/cart/cart-contents';
import { IconButton } from '@/components/ui/icon-button';
import { CloseIcon } from '@/components/ui/icons/close-icon';

export function CartDrawer({
  open,
  onOpenChange,
  returnFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}): ReactElement {
  const t = useTranslations('cart');
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
          className="fixed inset-y-0 end-0 z-50 flex w-full max-w-120 flex-col overflow-y-auto bg-canvas text-ink shadow-float"
        >
          <div className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-line bg-canvas px-4">
            <Dialog.Title className="text-h2">{t('title')}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton label={t('close')}>
                <CloseIcon className="size-6" />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="p-4">
            <CartContents onNavigate={() => onOpenChange(false)} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
