import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { CartContext } from '@/components/cart/cart-context';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { createCartStore } from '@/store/cart';
import en from '@messages/en.json';
import { resetNavigationMock } from '../helpers/navigation-mock';

vi.mock(
  '@/i18n/navigation',
  async () => (await import('../helpers/navigation-mock')).navigationModule,
);

describe('CheckoutForm empty state (SPEC 13a)', () => {
  it('announces the empty cart as a status and offers a way back to the shop', () => {
    resetNavigationMock();
    const store = createCartStore({});
    store.setState({ hydrated: true });
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <CartContext value={{ store, products: [], locale: 'en', openCart: vi.fn() }}>
          <CheckoutForm currency="USD" />
        </CartContext>
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole('status')).toHaveTextContent(en.checkout.empty);
    expect(screen.getByRole('link', { name: en.checkout.shop })).toHaveAttribute(
      'href',
      '/en/shop',
    );
  });
});
