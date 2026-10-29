import { describe, expect, it } from 'vitest';
import { LOOKS } from '@/data/looks';
import { PRODUCTS } from '@/data/products';
import { createLookSelection, toCartLines } from '@/lib/look';
import { priceLookCart } from '@/lib/look-cart';

const look = LOOKS[0];
if (!look) throw new Error('Missing fixture');
const lines = toCartLines(createLookSelection(look, PRODUCTS), look.id, PRODUCTS);
describe('current-catalogue grouped discounts (FR-052)', () => {
  it('pairs complete sets across different allowed products for the same slot', () => {
    const selection = createLookSelection(look, PRODUCTS);
    const hoodie = PRODUCTS.find((product) => product.slug === 'premium-hoodie');
    const variant = hoodie?.variants.find((item) => item.stock > 0);
    if (!hoodie || !variant) throw new Error('Missing fixture');
    const second = toCartLines(
      { ...selection, top: { productId: hoodie.id, colorId: variant.colorId, size: variant.size } },
      look.id,
      PRODUCTS,
    );
    const firstPrice = priceLookCart(lines, PRODUCTS, LOOKS, 'USD');
    const both = priceLookCart([...lines, ...second], PRODUCTS, LOOKS, 'USD');
    expect(both.groups[0]?.complete).toBe(true);
    expect(both.discountCents).toBeGreaterThan(firstPrice.discountCents);
  });
  it.each(['USD', 'THB'] as const)(
    'discounts complete sets in %s and removes the discount when any slot is absent',
    (currency) => {
      const full = priceLookCart(lines, PRODUCTS, LOOKS, currency);
      expect(full.groups[0]?.complete).toBe(true);
      expect(full.discountCents).toBeGreaterThan(0);
      const partial = priceLookCart(lines.slice(1), PRODUCTS, LOOKS, currency);
      expect(partial.discountCents).toBe(0);
      expect(partial.groups[0]?.complete).toBe(false);
      expect(full.totalCents + full.discountCents).toBe(full.subtotalCents);
    },
  );
  it('never discounts forged membership, regular lines, unknown SKUs or excess unpaired units', () => {
    expect(
      priceLookCart(
        lines.map((l) => ({ ...l, lookId: 'forged' })),
        PRODUCTS,
        LOOKS,
        'USD',
      ).discountCents,
    ).toBe(0);
    expect(
      priceLookCart(
        lines.map((l) => ({ sku: l.sku, qty: l.qty })),
        PRODUCTS,
        LOOKS,
        'USD',
      ).groups,
    ).toEqual([]);
    expect(priceLookCart([{ sku: 'missing', qty: 1 }], PRODUCTS, LOOKS, 'USD').subtotalCents).toBe(
      0,
    );
    const extra = lines.map((l, i) => (i === 0 ? { ...l, qty: 2 } : l));
    expect(priceLookCart(extra, PRODUCTS, LOOKS, 'USD').discountCents).toBe(
      priceLookCart(lines, PRODUCTS, LOOKS, 'USD').discountCents,
    );
  });
});
