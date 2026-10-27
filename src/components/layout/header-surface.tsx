'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { usePathname } from '@/i18n/navigation';

/** Attribute a hero puts on its bottom edge; the header turns solid once that edge scrolls away. */
export const HERO_SENTINEL_ATTRIBUTE = 'data-header-sentinel';

type HeaderSurfaceProps = { children: ReactNode };

/**
 * The `<header>` element (DESIGN 5.2). Whether it is transparent over a hero is decided by CSS from
 * the page itself (`body:has([data-header-sentinel])`, see globals.css), so the server HTML is right
 * before any JavaScript runs and no list of hero routes exists to drift. This island only reports
 * when the hero's bottom edge has scrolled up under the header, as `data-past-hero`, with one
 * IntersectionObserver (no scroll listener). The observer's top margin is the live header height
 * (64 or 80 px), re-measured when it changes.
 *
 * Without JavaScript a hero page keeps the transparent header all the way down; the hero must be
 * taller than the viewport or the page needs a dark top region (T07).
 */
export function HeaderSurface({ children }: HeaderSurfaceProps): ReactElement {
  const pathname = usePathname();
  // Remembered per route, so arriving on a hero page never starts from the previous page's answer.
  const [past, setPast] = useState({ path: pathname, value: false });
  const pastHero = past.path === pathname && past.value;
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (header === null) return undefined;
    const resize = new ResizeObserver(() => setHeaderHeight(header.offsetHeight));
    resize.observe(header);
    return () => resize.disconnect();
  }, []);

  useEffect(() => {
    const sentinel = document.querySelector(`[${HERO_SENTINEL_ATTRIBUTE}]`);
    if (sentinel === null) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry === undefined) return;
        // Past = out of view AND above the root's (header-shifted) top edge. Comparing with 0 would
        // miss it: the callback fires when the sentinel crosses that edge, still `headerHeight` down.
        const rootTop = entry.rootBounds?.top ?? headerHeight;
        setPast({
          path: pathname,
          value: !entry.isIntersecting && entry.boundingClientRect.top < rootTop,
        });
      },
      { rootMargin: `-${headerHeight}px 0px 0px 0px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [pathname, headerHeight]);

  return (
    <header
      ref={headerRef}
      data-past-hero={pastHero ? '' : undefined}
      className="site-header sticky top-0 z-40"
    >
      {/* Two cross-faded layers: only opacity animates (DESIGN 7). */}
      <div
        aria-hidden="true"
        className="site-header-solid absolute inset-0 border-b border-line bg-canvas transition-opacity motion-reduce:transition-none"
      />
      <div
        aria-hidden="true"
        className="site-header-scrim absolute inset-0 bg-linear-to-b from-overlay to-transparent transition-opacity motion-reduce:transition-none"
      />
      <div className="relative h-full">{children}</div>
    </header>
  );
}
