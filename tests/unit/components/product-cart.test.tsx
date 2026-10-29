import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductDetails } from '@/components/product/product-details';
import { CartContents } from '@/components/cart/cart-contents';
import { CartContext } from '@/components/cart/cart-context';
import { createCartStore } from '@/store/cart';
import { getProductBySlug } from '@/lib/catalogue';
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
const stock = Object.fromEntries(product.variants.map((variant) => [variant.sku, variant.stock]));
beforeEach(() => {
  localStorage.clear();
  resetNavigationMock();
});
async function fixture(locale: 'en' | 'th' = 'en') {
  if (!product) throw new Error('missing fixture');
  const store = createCartStore(stock);
  await store.persist.rehydrate();
  store.setState({ hydrated: true });
  const openCart = vi.fn();
  render(
    <NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : th}>
      <CartContext value={{ store, products: [product], locale, openCart }}>
        <ProductDetails product={product} locale={locale} currency="USD" />
        <CartContents />
      </CartContext>
    </NextIntlClientProvider>,
  );
  return { store, openCart };
}
describe('Product and cart behavior (FR-030–033, FR-050–051)', () => {
  it.each(['en', 'th'] as const)(
    'labels all three views and resets selection when colour changes (%s, FR-030)',
    async (locale) => {
      const copy = locale === 'en' ? en : th;
      await fixture(locale);
      const gallery = screen.getByRole('region', { name: copy.product.gallery });
      const track = within(gallery).getByRole('region', { name: copy.product.swipe });
      Object.defineProperty(track, 'scrollTo', { value: vi.fn() });
      const thumbnails = within(gallery).getAllByRole('button');
      expect(thumbnails).toHaveLength(3);
      for (const [index, label] of [
        copy.product.front,
        copy.product.back,
        copy.product.side,
      ].entries()) {
        const thumbnail = thumbnails[index];
        if (!thumbnail) throw new Error('missing view');
        expect(thumbnail).toHaveTextContent(label);
        fireEvent.click(thumbnail);
        expect(thumbnail).toHaveAttribute('aria-pressed', 'true');
      }
      expect(within(gallery).getByText(copy.product.generatedViews)).toBeVisible();
      const colours = screen.getByRole('group', { name: copy.product.color });
      fireEvent.click(
        within(colours).getByRole('radio', { name: locale === 'en' ? 'Black' : 'ดำ' }),
      );
      const updated = within(
        screen.getByRole('region', { name: copy.product.gallery }),
      ).getAllByRole('button');
      expect(updated[0]).toHaveAttribute('aria-pressed', 'true');
      expect(updated[1]).toHaveAttribute('aria-pressed', 'false');
      expect(updated[2]).toHaveAttribute('aria-pressed', 'false');
    },
  );

  it.each(['en', 'th'] as const)(
    'requires a variant, announces stock, adds safely, updates totals and removes (%s)',
    async (locale) => {
      const copy = locale === 'en' ? en : th;
      const { store, openCart } = await fixture(locale);
      const add = screen.getByRole('button', { name: copy.product.add });
      expect(add).toHaveAttribute('aria-disabled', 'true');
      const sizes = screen.getByRole('group', { name: copy.product.size });
      const sold = within(sizes).getByRole('radio', { name: /^XXL/ });
      expect(sold).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(sold);
      expect(sold).not.toBeChecked();
      fireEvent.click(within(sizes).getByRole('radio', { name: 'XS' }));
      expect(add).not.toHaveAttribute('aria-disabled');
      fireEvent.change(screen.getByRole('combobox', { name: copy.product.quantity }), {
        target: { value: '3' },
      });
      fireEvent.click(add);
      expect(store.getState().lines).toEqual([{ sku: 'essential-tee-sand-XS', qty: 3 }]);
      expect(openCart).toHaveBeenCalled();
      expect(screen.getByTestId('cart-subtotal')).toHaveTextContent(
        locale === 'en' ? '$147.00' : 'US$147.00',
      );
      fireEvent.change(screen.getByRole('combobox', { name: /Quantity for|จำนวน / }), {
        target: { value: '2' },
      });
      expect(screen.getByTestId('cart-subtotal')).toHaveTextContent(
        locale === 'en' ? '$98.00' : 'US$98.00',
      );
      fireEvent.click(screen.getByRole('button', { name: /Remove Essential|นำ เสื้อ/ }));
      await waitFor(() => expect(screen.queryByTestId('cart-subtotal')).not.toBeInTheDocument());
    },
  );
  it('waits for hydration before allowing writes or rendering persisted lines', async () => {
    const { store } = await fixture();
    act(() => store.setState({ hydrated: false }));
    expect(screen.getByText(en.cart.loading)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: en.product.add })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});
