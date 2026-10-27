import { describe, expect, it } from 'vitest';
import type { Product, Variant } from '@/data/schema';
import { getAllProducts, getProductBySlug } from '@/lib/catalogue';
import {
  LOW_STOCK_THRESHOLD,
  MAX_QTY_PER_LINE,
  availableColorsFor,
  availableSizesFor,
  clampQty,
  defaultColorFor,
  findVariant,
  isInStock,
  isLowStock,
  maxQtyFor,
} from '@/lib/stock';

const requireProduct = (slug: string): Product => {
  const product = getProductBySlug(slug);
  if (product === undefined) throw new Error(`missing seed product ${slug}`);
  return product;
};

const requireVariant = (slug: string, colorId: string, size: string): Variant => {
  const variant = findVariant(requireProduct(slug), colorId, size);
  if (variant === undefined) throw new Error(`missing variant ${slug} ${colorId} ${size}`);
  return variant;
};

describe('stock constants (RULES 7.4, FR-032)', () => {
  it('caps a cart line at 10 and flags low stock at 3 or fewer', () => {
    expect(MAX_QTY_PER_LINE).toBe(10);
    expect(LOW_STOCK_THRESHOLD).toBe(3);
  });
});

describe('findVariant', () => {
  it('finds the variant for a colour and size', () => {
    expect(requireVariant('essential-tee', 'sand', 'M').sku).toBe('essential-tee-sand-M');
  });

  it('returns undefined for an unknown colour or size', () => {
    const tee = requireProduct('essential-tee');
    expect(findVariant(tee, 'purple', 'M')).toBeUndefined();
    expect(findVariant(tee, 'sand', 'ONE')).toBeUndefined();
  });
});

describe('stock state (FR-032)', () => {
  it('treats zero stock as out of stock and anything above as in stock', () => {
    expect(isInStock(requireVariant('essential-tee', 'sand', 'XXL'))).toBe(false);
    expect(isInStock(requireVariant('essential-tee', 'sand', 'M'))).toBe(true);
    expect(isInStock(undefined)).toBe(false);
  });

  it('flags 1 to 3 units as low stock and nothing else', () => {
    expect(isLowStock({ stock: 0 })).toBe(false);
    expect(isLowStock({ stock: 1 })).toBe(true);
    expect(isLowStock({ stock: 3 })).toBe(true);
    expect(isLowStock({ stock: 4 })).toBe(false);
    expect(isLowStock(undefined)).toBe(false);
  });

  it('shows low stock on seeded variants (hoodie forest M has 1, cap sand has 3)', () => {
    expect(isLowStock(requireVariant('premium-hoodie', 'forest', 'M'))).toBe(true);
    expect(isLowStock(requireVariant('classic-cap', 'sand', 'ONE'))).toBe(true);
  });
});

describe('maxQtyFor and clampQty (RULES 7.4)', () => {
  it('allows the smaller of stock and 10', () => {
    expect(maxQtyFor({ stock: 4 })).toBe(4);
    expect(maxQtyFor({ stock: 10 })).toBe(10);
    expect(maxQtyFor({ stock: 25 })).toBe(10);
    expect(maxQtyFor({ stock: 0 })).toBe(0);
    expect(maxQtyFor(undefined)).toBe(0);
  });

  it.each([
    [1, 5, 1],
    [3, 5, 3],
    [9, 5, 5],
    [0, 5, 1],
    [-4, 5, 1],
    [2.9, 5, 2],
    [Number.NaN, 5, 1],
    [Number.POSITIVE_INFINITY, 5, 5],
    [Number.NEGATIVE_INFINITY, 5, 1],
    [50, 25, 10],
  ])('clamps a request for %s with stock %i to %i', (qty, stock, expected) => {
    expect(clampQty(qty, { stock })).toBe(expected);
  });

  it('returns 0 when the variant is out of stock or unknown', () => {
    expect(clampQty(3, { stock: 0 })).toBe(0);
    expect(clampQty(3, undefined)).toBe(0);
  });
});

describe('availableSizesFor (FR-031)', () => {
  it('lists every size in canonical order with availability and a reason', () => {
    const options = availableSizesFor(requireProduct('essential-tee'), 'sand');
    expect(options.map((option) => option.value)).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
    expect(options.find((option) => option.value === 'M')).toEqual({
      value: 'M',
      available: true,
      reason: null,
      stock: 15,
    });
    expect(options.find((option) => option.value === 'XXL')).toEqual({
      value: 'XXL',
      available: false,
      reason: 'out-of-stock',
      stock: 0,
    });
  });

  it('marks every size of a sold-out colour unavailable', () => {
    const options = availableSizesFor(requireProduct('everyday-jogger'), 'grey');
    expect(options.every((option) => !option.available && option.reason === 'out-of-stock')).toBe(
      true,
    );
  });

  it('reports sizes a colour is not sold in as not-offered', () => {
    const product = {
      variants: [
        { sku: 'a-red-XS', colorId: 'red', size: 'XS', stock: 4 },
        { sku: 'a-red-S', colorId: 'red', size: 'S', stock: 4 },
        { sku: 'a-blue-S', colorId: 'blue', size: 'S', stock: 4 },
      ],
    } satisfies Pick<Product, 'variants'>;
    const options = availableSizesFor(product, 'blue');
    expect(options.map((option) => [option.value, option.reason])).toEqual([
      ['XS', 'not-offered'],
      ['S', null],
    ]);
  });

  it('marks all sizes not-offered for a colour the product does not have', () => {
    const options = availableSizesFor(requireProduct('essential-tee'), 'purple');
    expect(options.every((option) => option.reason === 'not-offered')).toBe(true);
  });

  it('offers the single ONE size for caps', () => {
    const options = availableSizesFor(requireProduct('classic-cap'), 'sand');
    expect(options).toEqual([{ value: 'ONE', available: true, reason: null, stock: 3 }]);
  });
});

describe('availableColorsFor (FR-031)', () => {
  it('disables colours that are sold out in the chosen size', () => {
    const options = availableColorsFor(requireProduct('essential-tee'), 'XXL');
    expect(options.map((option) => [option.value, option.available])).toEqual([
      ['sand', false],
      ['black', true],
      ['white', true],
      ['forest', true],
    ]);
    expect(options[0]?.reason).toBe('out-of-stock');
  });

  it('without a size, a colour is available when any size is in stock', () => {
    const options = availableColorsFor(requireProduct('everyday-jogger'), null);
    expect(options.map((option) => [option.value, option.available])).toEqual([
      ['black', true],
      ['sand', true],
      ['forest', true],
      ['grey', false],
    ]);
    expect(options[0]?.stock).toBe(61);
    expect(options[3]?.reason).toBe('out-of-stock');
  });

  it('reports colours as not-offered in a size the product does not have', () => {
    const options = availableColorsFor(requireProduct('classic-cap'), 'XL');
    expect(options.every((option) => option.reason === 'not-offered')).toBe(true);
  });
});

describe('defaultColorFor (FR-031)', () => {
  const variant = (colorId: string, stock: number): Variant => ({
    sku: `x-${colorId}-M`,
    colorId,
    size: 'M',
    stock,
  });
  const color = (id: string): Product['colors'][number] => ({
    id,
    name: { en: id, th: id },
    hex: '#000000',
  });

  it('preselects the first colour that has stock, skipping a sold-out first colour', () => {
    const product = {
      colors: [color('grey'), color('black')],
      variants: [variant('grey', 0), variant('black', 4)],
    };
    expect(defaultColorFor(product)).toBe('black');
  });

  it('keeps the first colour when it has stock', () => {
    const product = {
      colors: [color('sand'), color('black')],
      variants: [variant('sand', 1), variant('black', 9)],
    };
    expect(defaultColorFor(product)).toBe('sand');
  });

  it('falls back to the first colour when everything is sold out', () => {
    const product = {
      colors: [color('sand'), color('black')],
      variants: [variant('sand', 0), variant('black', 0)],
    };
    expect(defaultColorFor(product)).toBe('sand');
  });

  it('returns undefined for a product without colours', () => {
    expect(defaultColorFor({ colors: [], variants: [] })).toBeUndefined();
  });

  it('never preselects a sold-out colour for any seed product', () => {
    for (const product of getAllProducts()) {
      const id = defaultColorFor(product);
      expect(product.variants.some((v) => v.colorId === id && v.stock > 0)).toBe(true);
    }
  });
});
