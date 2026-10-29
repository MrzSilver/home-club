import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CartProvider } from '@/components/cart/cart-provider';
import { Header } from '@/components/layout/header';
import en from '@messages/en.json';
import th from '@messages/th.json';
import { resetNavigationMock } from '../helpers/navigation-mock';

vi.mock(
  'next-intl/server',
  async () => (await import('../helpers/intl-server-mock')).serverIntlModule,
);
vi.mock(
  '@/i18n/navigation',
  async () => (await import('../helpers/navigation-mock')).navigationModule,
);
vi.mock('next/navigation', () => ({ useParams: () => ({ currency: 'usd' }) }));

async function renderHeader(locale: 'en' | 'th'): Promise<void> {
  const header = await Header({ locale });
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ cart: locale === 'en' ? en.cart : th.cart }}
    >
      <CartProvider products={[]} locale={locale}>
        {header}
      </CartProvider>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  resetNavigationMock('/shop');
  vi.stubGlobal('IntersectionObserver', undefined);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      disconnect(): void {}
    },
  );
});

describe('Header (FR-001)', () => {
  it.each([
    ['en', en],
    ['th', th],
  ] as const)(
    'is a banner with the menu button, home link, search and cart in %s',
    async (locale, messages) => {
      resetNavigationMock('/shop', locale);
      await renderHeader(locale);

      const banner = screen.getByRole('banner');
      expect(
        within(banner).getByRole('button', { name: messages.nav.menu.open }),
      ).toBeInTheDocument();
      expect(within(banner).getByRole('link', { name: messages.nav.homeLink })).toHaveAttribute(
        'href',
        `/${locale}`,
      );
      expect(
        within(banner).getByRole('button', { name: messages.nav.search.label }),
      ).toBeInTheDocument();
      expect(
        within(banner).getByRole('button', { name: messages.nav.cart.label }),
      ).toBeInTheDocument();
    },
  );

  it('shows the wordmark in Latin, whatever the page language, with its own lang', async () => {
    resetNavigationMock('/shop', 'th');
    await renderHeader('th');

    const wordmark = screen.getByText('Home Club').closest('[lang]');
    expect(wordmark).toHaveAttribute('lang', 'en');
    expect(within(screen.getByRole('banner')).getByText('Foundation')).toBeInTheDocument();
  });

  it.each([['search', en.nav.search]])(
    'keeps %s focusable and exposes its search dialog (FR-023)',
    async (_name, copy) => {
      await renderHeader('en');

      const button = screen.getByRole('button', { name: copy.label });
      expect(button).not.toBeDisabled();
      expect(button).not.toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    },
  );

  it('reserves a fixed-size, out-of-flow box for the cart count badge (T10 fills it, nothing shifts)', async () => {
    await renderHeader('en');

    const cart = screen.getByRole('button', { name: en.nav.cart.label });
    const slot = cart.querySelector('[data-slot="cart-badge"]');
    expect(slot).toBeInTheDocument();
    expect(slot).toHaveClass('absolute', 'size-4');
    expect(slot).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps search and cart 8px apart (DESIGN 11: spacing between adjacent targets)', async () => {
    await renderHeader('en');

    const search = screen.getByRole('button', { name: en.nav.search.label });
    expect(search.parentElement).toHaveClass('gap-2');
    expect(search.parentElement).toContainElement(
      screen.getByRole('button', { name: en.nav.cart.label }),
    );
  });

  it('puts no visible text in the menu button: its name is the label only', async () => {
    await renderHeader('en');

    expect(screen.getByRole('button', { name: en.nav.menu.open })).toHaveTextContent('');
  });
});
