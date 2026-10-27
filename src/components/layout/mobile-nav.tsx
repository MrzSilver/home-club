'use client';

import { useRef, useState } from 'react';
import type { ComponentType, ReactElement } from 'react';

import type { MobileNavPanelProps } from '@/components/layout/mobile-nav-panel';
import type { MobileNavContent } from '@/components/layout/mobile-nav-types';
import { MenuIcon } from '@/components/ui/icons/menu-icon';
import { IconButton } from '@/components/ui/icon-button';

// The drawer (Radix Dialog, focus trap, scroll lock, the two switchers) is loaded the first time it is
// needed, not with the page: it is about a third of the shell's JavaScript and most visits never open
// it (ADR-0005, budgets in ADR-0004). The trigger below warms the chunk on hover, focus and touch so
// the click that opens it does not wait for the network.
type PanelComponent = ComponentType<MobileNavPanelProps>;

const loadPanel = (): Promise<PanelComponent> =>
  import('@/components/layout/mobile-nav-panel').then((module) => module.MobileNavPanel);

type MobileNavProps = { content: MobileNavContent };

/** Hamburger button plus the menu drawer, at every viewport size (mock-up, DESIGN 5.2). */
export function MobileNav({ content }: MobileNavProps): ReactElement {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [Panel, setPanel] = useState<PanelComponent | null>(null);
  const [open, setOpen] = useState(false);
  // True while the first open waits for the drawer's code: on a slow link that can take seconds.
  const [loading, setLoading] = useState(false);

  async function openMenu(): Promise<void> {
    if (Panel !== null) {
      setOpen(true);
      return;
    }
    setLoading(true);
    try {
      const loaded = await loadPanel();
      setPanel(() => loaded);
      setOpen(true);
    } catch {
      // The chunk could not be fetched (offline, deploy in between). Leave the button as it was so a
      // later press tries again; a failed dynamic import is not cached by the bundler's loader.
      console.error('The menu could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  function warm(): void {
    // Errors surface when the menu is actually opened.
    void loadPanel().catch(() => undefined);
  }

  return (
    <>
      <IconButton
        ref={triggerRef}
        label={content.openLabel}
        aria-haspopup="dialog"
        // Only "expanded" once there is a dialog to be expanded; busy while the code loads.
        aria-expanded={open}
        aria-busy={loading ? true : undefined}
        onClick={() => void openMenu()}
        onPointerEnter={warm}
        onFocus={warm}
        onTouchStart={warm}
      >
        <MenuIcon className="size-6" />
      </IconButton>
      {Panel === null ? null : (
        <Panel open={open} onOpenChange={setOpen} content={content} returnFocusRef={triggerRef} />
      )}
    </>
  );
}
