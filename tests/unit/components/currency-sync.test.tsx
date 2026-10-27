import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CurrencySync } from '@/components/layout/currency-sync';
import { resetNavigationMock, routerMock } from '../helpers/navigation-mock';

vi.mock(
  '@/i18n/navigation',
  async () => (await import('../helpers/navigation-mock')).navigationModule,
);

const params = vi.hoisted(() => ({ current: {} as { currency?: string } }));
vi.mock('next/navigation', () => ({ useParams: () => params.current }));

function setCookie(value: string | null): void {
  document.cookie = `hc_currency=${value ?? ''}; Path=/; Max-Age=${value === null ? 0 : 60}`;
}

beforeEach(() => {
  resetNavigationMock();
  setCookie(null);
  params.current = { currency: 'usd' };
});

describe('CurrencySync (history navigation, ADR-0003)', () => {
  it('refreshes once when the cookie currency differs from the page currency on mount', () => {
    setCookie('THB');
    render(<CurrencySync />);

    expect(routerMock.refresh).toHaveBeenCalledOnce();
  });

  it('does nothing when the cookie and the page agree', () => {
    setCookie('USD');
    render(<CurrencySync />);

    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it('does nothing without a cookie (the page already shows the locale default)', () => {
    render(<CurrencySync />);

    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it('ignores an invalid cookie value and an unknown route segment', () => {
    setCookie('EUR');
    render(<CurrencySync />);
    params.current = {};
    setCookie('THB');
    render(<CurrencySync />);

    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it('checks again on pageshow, for a page restored from the back/forward cache', () => {
    render(<CurrencySync />);
    expect(routerMock.refresh).not.toHaveBeenCalled();

    setCookie('THB');
    window.dispatchEvent(new Event('pageshow'));

    expect(routerMock.refresh).toHaveBeenCalledOnce();
  });

  it('stops listening on unmount and renders nothing', () => {
    const { container, unmount } = render(<CurrencySync />);
    expect(container).toBeEmptyDOMElement();
    unmount();

    setCookie('THB');
    window.dispatchEvent(new Event('pageshow'));

    expect(routerMock.refresh).not.toHaveBeenCalled();
  });
});
