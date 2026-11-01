import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartContents } from '@/components/cart/cart-contents';
import { CartContext } from '@/components/cart/cart-context';
import { getProductBySlug } from '@/lib/catalogue';
import { createCartStore, type CartRecovery } from '@/store/cart';
import en from '@messages/en.json';
import th from '@messages/th.json';
import { resetNavigationMock } from '../helpers/navigation-mock';

vi.mock(
  '@/i18n/navigation',
  async () => (await import('../helpers/navigation-mock')).navigationModule,
);
vi.mock('next/navigation', () => ({ useParams: () => ({ currency: 'usd' }) }));

const product = getProductBySlug('essential-tee');
if (!product) throw new Error('missing fixture');
const fixtureProduct = product;
const stock = Object.fromEntries(product.variants.map((variant) => [variant.sku, variant.stock]));

function setup(
  locale: 'en' | 'th',
  state: { hydrated: boolean; recovery: CartRecovery | null },
): ReturnType<typeof createCartStore> {
  const store = createCartStore(stock);
  store.setState(state);
  render(
    <NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : th}>
      <CartContext value={{ store, products: [fixtureProduct], locale, openCart: vi.fn() }}>
        <CartContents />
      </CartContext>
    </NextIntlClientProvider>,
  );
  return store;
}

beforeEach(() => {
  localStorage.clear();
  resetNavigationMock();
});

describe('Cart recovery notice (FR-051, SPEC 13a)', () => {
  it.each(['en', 'th'] as const)('shows the reset and adjusted copy (%s)', (locale) => {
    const copy = locale === 'en' ? en : th;
    setup(locale, { hydrated: true, recovery: 'reset' });
    expect(screen.getByText(copy.cart.recovery.reset)).toBeVisible();
    expect(screen.getByRole('button', { name: copy.cart.recovery.dismiss })).toBeVisible();
    expect(screen.getByRole('link', { name: copy.cart.continue })).toBeVisible();
  });

  it.each(['en', 'th'] as const)('shows the adjusted copy (%s)', (locale) => {
    const copy = locale === 'en' ? en : th;
    setup(locale, { hydrated: true, recovery: 'adjusted' });
    expect(screen.getByText(copy.cart.recovery.adjusted)).toBeVisible();
  });

  it('dismiss hides the notice, clears the store and moves focus into the cart', async () => {
    const store = setup('en', { hydrated: true, recovery: 'reset' });
    fireEvent.click(screen.getByRole('button', { name: en.cart.recovery.dismiss }));
    expect(store.getState().recovery).toBeNull();
    expect(screen.queryByText(en.cart.recovery.reset)).toBeNull();
    await waitFor(() => expect(screen.getByRole('link', { name: en.cart.continue })).toHaveFocus());
  });

  it('renders nothing extra before hydration or when there is nothing to report', () => {
    setup('en', { hydrated: false, recovery: 'reset' });
    expect(screen.queryByText(en.cart.recovery.reset)).toBeNull();
    expect(screen.getByText(en.cart.loading)).toBeVisible();
  });

  it('renders no notice when recovery is null', () => {
    setup('en', { hydrated: true, recovery: null });
    expect(screen.queryByRole('button', { name: en.cart.recovery.dismiss })).toBeNull();
  });
});
