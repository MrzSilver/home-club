import type { AnchorHTMLAttributes, ReactElement } from 'react';
import { vi } from 'vitest';

// Stand-in for `@/i18n/navigation` in component tests: the real helpers need a Next.js router and
// request. State lives here so a test can set the pathname and read the router calls.
export const navigationState = { pathname: '/', locale: 'en' };

export const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

type MockLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  locale?: string;
  prefetch?: boolean;
};

function MockLink({ href, locale, prefetch, ...rest }: MockLinkProps): ReactElement {
  void prefetch; // accepted like the real Link, not rendered
  const prefix = `/${locale ?? navigationState.locale}`;
  // eslint-disable-next-line jsx-a11y/anchor-has-content -- children arrive through `rest`
  return <a {...rest} href={href === '/' ? prefix : `${prefix}${href}`} />;
}

export const navigationModule = {
  Link: MockLink,
  usePathname: (): string => navigationState.pathname,
  useRouter: (): typeof routerMock => routerMock,
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  getPathname: vi.fn(),
};

export function resetNavigationMock(pathname = '/', locale = 'en'): void {
  navigationState.pathname = pathname;
  navigationState.locale = locale;
  for (const fn of Object.values(routerMock)) fn.mockReset();
}

/**
 * Clicks a link and reports whether the app's own handler took over (called preventDefault), then
 * cancels the browser default so jsdom does not log "navigation not implemented".
 */
export function clickLink(element: Element, init: MouseEventInit = {}): { takenOver: boolean } {
  let takenOver = false;
  const observe = (event: Event): void => {
    takenOver = event.defaultPrevented;
    event.preventDefault();
  };
  document.addEventListener('click', observe);
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
  document.removeEventListener('click', observe);
  return { takenOver };
}
