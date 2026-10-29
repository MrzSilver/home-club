import { describe, expect, it } from 'vitest';
import { LOOKS } from '@/data/looks';
import { PRODUCTS } from '@/data/products';
import {
  createLookSelection,
  validateSelection,
  priceLook,
  toCartLines,
  findAlternatives,
} from '@/lib/look';

const look = LOOKS[0];
if (!look) throw new Error('Missing look fixture');
describe('four-slot look (FR-040, FR-041, FR-042, FR-043)', () => {
  it('selects available defaults and prices the set once in either currency', () => {
    const selection = createLookSelection(look, PRODUCTS);
    expect(validateSelection(look, selection, PRODUCTS)).toEqual({ ok: true });
    for (const currency of ['USD', 'THB'] as const) {
      const price = priceLook(selection, look.discountPct, PRODUCTS, currency);
      expect(price.totalCents + price.discountCents).toBe(price.subtotalCents);
      expect(price.discountCents).toBeGreaterThan(0);
    }
    expect(toCartLines(selection, look.id, PRODUCTS)).toHaveLength(4);
  });
  it('rejects foreign products, missing variants and sold-out selections and offers valid alternatives', () => {
    const selection = createLookSelection(look, PRODUCTS);
    const invalid = { ...selection, top: { productId: 'missing', colorId: 'bad', size: 'M' } };
    expect(validateSelection(look, invalid, PRODUCTS)).toEqual({
      ok: false,
      errors: [{ slot: 'top', reason: 'product' }],
    });
    expect(() => toCartLines(invalid, look.id, PRODUCTS)).toThrow();
    const product = PRODUCTS.find((p) => p.id === selection.top.productId);
    if (!product) throw new Error('Missing product');
    const sold = PRODUCTS.map((p) =>
      p.id === product.id ? { ...p, variants: p.variants.map((v) => ({ ...v, stock: 0 })) } : p,
    );
    expect(validateSelection(look, selection, sold).ok).toBe(false);
    expect(findAlternatives('top', look, sold).every((a) => a.variant.stock > 0)).toBe(true);
    expect(
      validateSelection(
        look,
        { ...selection, top: { ...selection.top, size: 'invalid' } },
        PRODUCTS,
      ).ok,
    ).toBe(false);
    expect(() => priceLook(invalid, 10, PRODUCTS, 'USD')).toThrow();
  });
});
