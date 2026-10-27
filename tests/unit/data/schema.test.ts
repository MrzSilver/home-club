import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '@/data/products';
import {
  LOCALES,
  CATEGORIES,
  SIZES,
  SLOTS,
  VIBES,
  cartLineSchema,
  lookSchema,
  productSchema,
  type Product,
} from '@/data/schema';
import { LOOKS } from '@/data/looks';

const first = (): Product => {
  const product = PRODUCTS[0];
  if (product === undefined) throw new Error('no seed product');
  return product;
};

const withVariants = (variants: Product['variants']): unknown => ({ ...first(), variants });

describe('schema tuples (SPEC 5)', () => {
  it('exports the ordered literal tuples', () => {
    expect(LOCALES).toEqual(['en', 'th']);
    expect(CATEGORIES).toEqual(['foundations', 'performance', 'lifestyle', 'accessories']);
    expect(VIBES).toEqual(['performance', 'outdoor', 'lazy', 'skate', 'hockey']);
    expect(SLOTS).toEqual(['top', 'bottom', 'cap', 'socks']);
    expect(SIZES).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE']);
  });
});

describe('productSchema rejects broken products (SPEC 5 invariants)', () => {
  it('accepts a seed product', () => {
    expect(productSchema.safeParse(first()).success).toBe(true);
  });

  it('rejects a variant whose colour is not in the product colours', () => {
    const [variant, ...rest] = first().variants;
    if (variant === undefined) throw new Error('no variant');
    const bad = withVariants([
      { ...variant, colorId: 'neon', sku: `${first().slug}-neon-${variant.size}` },
      ...rest,
    ]);
    expect(productSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a SKU that does not follow slug-colorId-size', () => {
    const [variant, ...rest] = first().variants;
    if (variant === undefined) throw new Error('no variant');
    expect(
      productSchema.safeParse(withVariants([{ ...variant, sku: 'whatever' }, ...rest])).success,
    ).toBe(false);
  });

  it('rejects duplicate SKUs', () => {
    const [variant] = first().variants;
    if (variant === undefined) throw new Error('no variant');
    expect(productSchema.safeParse(withVariants([variant, variant])).success).toBe(false);
  });

  it('rejects an image for an unknown colour and a colour without images', () => {
    const [image, ...rest] = first().images;
    if (image === undefined) throw new Error('no image');
    expect(
      productSchema.safeParse({ ...first(), images: [{ ...image, colorId: 'neon' }, ...rest] })
        .success,
    ).toBe(false);
    const sandOnly = first().images.filter((candidate) => candidate.colorId === 'sand');
    expect(productSchema.safeParse({ ...first(), images: sandOnly }).success).toBe(false);
  });

  it('rejects non-integer or non-positive prices and negative or fractional stock', () => {
    expect(productSchema.safeParse({ ...first(), priceCents: 49.5 }).success).toBe(false);
    expect(productSchema.safeParse({ ...first(), priceCents: 0 }).success).toBe(false);
    const [variant, ...rest] = first().variants;
    if (variant === undefined) throw new Error('no variant');
    expect(
      productSchema.safeParse(withVariants([{ ...variant, stock: -1 }, ...rest])).success,
    ).toBe(false);
    expect(
      productSchema.safeParse(withVariants([{ ...variant, stock: 1.5 }, ...rest])).success,
    ).toBe(false);
  });

  it('rejects empty copy, bad slugs and unknown extra keys', () => {
    expect(productSchema.safeParse({ ...first(), name: { en: 'Tee', th: ' ' } }).success).toBe(
      false,
    );
    expect(productSchema.safeParse({ ...first(), slug: 'Not Kebab' }).success).toBe(false);
    expect(productSchema.safeParse({ ...first(), extra: true }).success).toBe(false);
  });

  it('rejects images outside /images or in the wrong format', () => {
    const [image, ...rest] = first().images;
    if (image === undefined) throw new Error('no image');
    for (const src of ['https://cdn.example.com/a.webp', '/images/a.png', '/other/a.webp']) {
      expect(
        productSchema.safeParse({ ...first(), images: [{ ...image, src }, ...rest] }).success,
      ).toBe(false);
    }
  });
});

describe('lookSchema', () => {
  const look = (): unknown => structuredClone(LOOKS[0]);

  it('accepts the seed look', () => {
    expect(lookSchema.safeParse(look()).success).toBe(true);
  });

  it('rejects a default product that is not in the allowed list', () => {
    const bad = structuredClone(LOOKS[0]);
    if (bad === undefined) throw new Error('no look');
    bad.slots.top.defaultProductId = 'p-somewhere-else';
    expect(lookSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a discount outside 0-50 and a missing slot', () => {
    const base = structuredClone(LOOKS[0]);
    if (base === undefined) throw new Error('no look');
    expect(lookSchema.safeParse({ ...base, discountPct: 51 }).success).toBe(false);
    expect(lookSchema.safeParse({ ...base, discountPct: 10.5 }).success).toBe(false);
    const { top, bottom, socks } = base.slots;
    expect(lookSchema.safeParse({ ...base, slots: { top, bottom, socks } }).success).toBe(false);
  });
});

describe('cartLineSchema (RULES 7.4)', () => {
  it('accepts quantities 1 to 10 and rejects the rest', () => {
    expect(cartLineSchema.safeParse({ sku: 'a-b-M', qty: 10 }).success).toBe(true);
    expect(cartLineSchema.safeParse({ sku: 'a-b-M', qty: 11 }).success).toBe(false);
    expect(cartLineSchema.safeParse({ sku: 'a-b-M', qty: 0 }).success).toBe(false);
    expect(cartLineSchema.safeParse({ sku: 'a-b-M', qty: 1.5 }).success).toBe(false);
  });

  it('keeps lookId optional', () => {
    expect(
      cartLineSchema.safeParse({ sku: 'a-b-M', qty: 1, lookId: 'look-essential' }).success,
    ).toBe(true);
    expect(cartLineSchema.safeParse({ sku: '', qty: 1 }).success).toBe(false);
  });
});
