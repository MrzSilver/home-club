import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CurrencySwitcher } from '@/components/layout/currency-switcher';
import { resetNavigationMock, routerMock } from '../helpers/navigation-mock';

vi.mock(
  '@/i18n/navigation',
  async () => (await import('../helpers/navigation-mock')).navigationModule,
);

const params = vi.hoisted(() => ({ current: {} as { currency?: string } }));
vi.mock('next/navigation', () => ({ useParams: () => params.current }));

const NAMES = { USD: 'US dollar (USD)', THB: 'Thai baht (THB)' } as const;
const ANNOUNCE = {
  USD: 'Prices are now shown in US dollars (USD).',
  THB: 'Prices are now shown in Thai baht (THB).',
} as const;

function renderSwitcher(locale: 'en' | 'th' = 'en'): ReactElement | void {
  render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <CurrencySwitcher label="Currency" names={NAMES} announcements={ANNOUNCE} />
    </NextIntlClientProvider>,
  );
}

function clearCookie(): void {
  document.cookie = 'hc_currency=; Path=/; Max-Age=0';
}

beforeEach(() => {
  resetNavigationMock();
  params.current = { currency: 'usd' };
  clearCookie();
});

describe('CurrencySwitcher (FR-002)', () => {
  it('is a labelled radio group with the route currency selected', () => {
    params.current = { currency: 'thb' };
    renderSwitcher();

    expect(screen.getByRole('group', { name: 'Currency' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Thai baht (THB)' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'US dollar (USD)' })).not.toBeChecked();
  });

  it('falls back to the locale default when the route has no currency', () => {
    params.current = {};
    renderSwitcher('th');

    expect(screen.getByRole('radio', { name: 'Thai baht (THB)' })).toBeChecked();
  });

  it('writes the one-year hc_currency cookie, refreshes the route and announces the change', () => {
    renderSwitcher();

    fireEvent.click(screen.getByRole('radio', { name: 'Thai baht (THB)' }));

    expect(document.cookie).toContain('hc_currency=THB');
    expect(routerMock.refresh).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent(ANNOUNCE.THB);
    expect(screen.getByRole('radio', { name: 'Thai baht (THB)' })).toBeChecked();
  });

  it('does not refresh or announce when the current currency is chosen again', () => {
    renderSwitcher();

    fireEvent.click(screen.getByRole('radio', { name: 'US dollar (USD)' }));

    expect(routerMock.refresh).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain('hc_currency');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('gives each switcher its own radio group name, so two groups on a page never merge', () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={{}}>
        <CurrencySwitcher label="Currency" names={NAMES} announcements={ANNOUNCE} />
        <CurrencySwitcher label="Currency" names={NAMES} announcements={ANNOUNCE} />
      </NextIntlClientProvider>,
    );

    const names = new Set(
      [...container.querySelectorAll('input[type="radio"]')].map((input) =>
        input.getAttribute('name'),
      ),
    );
    expect(names.size).toBe(2);
    expect(names.has('currency')).toBe(false);
  });

  it('keeps focus on the radio the visitor used', () => {
    renderSwitcher();
    const baht = screen.getByRole('radio', { name: 'Thai baht (THB)' });
    baht.focus();

    fireEvent.click(baht);

    expect(baht).toHaveFocus();
  });

  it('announces back when switching to dollars', () => {
    params.current = { currency: 'thb' };
    renderSwitcher();

    fireEvent.click(screen.getByRole('radio', { name: 'US dollar (USD)' }));

    expect(document.cookie).toContain('hc_currency=USD');
    expect(screen.getByRole('status')).toHaveTextContent(ANNOUNCE.USD);
  });
});
