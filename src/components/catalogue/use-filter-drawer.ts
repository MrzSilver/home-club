'use client';

import { useEffect, useRef, useState } from 'react';
import type { ComponentType, Dispatch, RefObject, SetStateAction } from 'react';

import type { FilterDrawerProps } from '@/components/catalogue/filter-drawer';

// The drawer (Radix Dialog, focus trap) loads the first time it is needed, like the menu drawer
// (ADR-0005): most visits are on a screen wide enough for the sidebar, or never open it.
type DrawerComponent = ComponentType<FilterDrawerProps>;

const loadDrawer = (): Promise<DrawerComponent> =>
  import('@/components/catalogue/filter-drawer').then((module) => module.FilterDrawer);

// Matches the `lg` breakpoint (tokens.css): from here the sidebar replaces the drawer.
const SIDEBAR_QUERY = '(min-width: 64rem)';

type FilterDrawerState = {
  /** The loaded drawer component; null until the first open. */
  Drawer: DrawerComponent | null;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  /** True while the first open waits for the drawer's code. */
  loading: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  openDrawer: () => Promise<void>;
  /** Starts the download early (hover, focus, touch) so the click that opens the drawer is instant. */
  warm: () => void;
};

/** Loads and opens the filters drawer on demand; closes it if the window grows to the sidebar width. */
export function useFilterDrawer(): FilterDrawerState {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [Drawer, setDrawer] = useState<DrawerComponent | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Past the sidebar breakpoint the drawer has no trigger; close it if the window grows while open.
  useEffect(() => {
    const media = window.matchMedia(SIDEBAR_QUERY);
    const close = (): void => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener('change', close);
    return () => media.removeEventListener('change', close);
  }, []);

  async function openDrawer(): Promise<void> {
    if (Drawer !== null) {
      setOpen(true);
      return;
    }
    setLoading(true);
    try {
      const loaded = await loadDrawer();
      setDrawer(() => loaded);
      setOpen(true);
    } catch {
      // The chunk could not be fetched (offline, deploy in between): the button stays as it was.
      console.error('The filters could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  function warm(): void {
    // Errors surface when the drawer is actually opened.
    void loadDrawer().catch(() => undefined);
  }

  return { Drawer, open, setOpen, loading, triggerRef, openDrawer, warm };
}
