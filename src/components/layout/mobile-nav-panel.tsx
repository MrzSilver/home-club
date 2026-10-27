'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { ReactElement, RefObject } from 'react';

import { CurrencySwitcher } from '@/components/layout/currency-switcher';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import type { MobileNavContent } from '@/components/layout/mobile-nav-types';
import type { NavLink } from '@/components/layout/nav-links';
import { CloseIcon } from '@/components/ui/icons/close-icon';
import { IconButton } from '@/components/ui/icon-button';
import { Link } from '@/i18n/navigation';

export type MobileNavPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: MobileNavContent;
  /** The hamburger: focus goes back to it on close (Safari does not focus buttons on click). */
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

const LINK_CLASS =
  'flex min-h-11 items-center rounded-md px-2 text-h3 uppercase-latin hover:bg-surface';

function NavList({
  links,
  onNavigate,
}: {
  links: NavLink[];
  onNavigate: () => void;
}): ReactElement {
  return (
    <ul>
      {links.map((link) => (
        <li key={link.href}>
          <Link href={link.href} prefetch={false} onClick={onNavigate} className={LINK_CLASS}>
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The menu drawer. Radix Dialog supplies what RULES 8.6 asks of a drawer: focus trap, Esc to close,
 * background hidden from assistive technology and blocked from pointer input, scroll lock. Focus
 * returns to the hamburger. Loaded on demand by `MobileNav`.
 */
export function MobileNavPanel({
  open,
  onOpenChange,
  content,
  returnFocusRef,
}: MobileNavPanelProps): ReactElement {
  const close = (): void => onOpenChange(false);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          aria-modal="true"
          // No description to announce: the title and the links say everything.
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
          className="drawer-panel-start fixed inset-y-0 start-0 z-50 flex w-full max-w-80 flex-col overflow-y-auto bg-canvas text-ink shadow-float"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line ps-4 pe-2 md:h-20">
            <Dialog.Title className="text-eyebrow uppercase-latin">{content.title}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton label={content.closeLabel}>
                <CloseIcon className="size-6" />
              </IconButton>
            </Dialog.Close>
          </div>

          <nav aria-label={content.navLabel} className="px-2 py-4">
            <NavList links={content.primary} onNavigate={close} />
            <p className="mt-4 px-2 text-eyebrow uppercase-latin text-muted">
              {content.categoriesHeading}
            </p>
            <NavList links={content.categories} onNavigate={close} />
          </nav>

          <div className="mt-auto space-y-6 border-t border-line p-4">
            <LocaleSwitcher
              label={content.localeLabel}
              names={content.localeNames}
              onNavigate={close}
            />
            <CurrencySwitcher
              label={content.currencyLabel}
              names={content.currencyNames}
              announcements={content.currencyAnnouncements}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
