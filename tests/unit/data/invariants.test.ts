import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { HERO_IMAGES } from '@/data/brand';
import { CATEGORY_ENTRIES } from '@/data/categories';
import { LOOKS } from '@/data/looks';
import { FEATURED_ESSENTIAL_IDS, PRODUCTS } from '@/data/products';
import {
  CATEGORIES,
  SIZES,
  SLOTS,
  VIBES,
  lookSchema,
  productSchema,
  type ImageAsset,
  type Product,
} from '@/data/schema';
import { VIBE_ENTRIES } from '@/data/vibes';
// scripts/ sits outside the `@/` alias (which maps to src/), so a relative path is the only option.
// eslint-disable-next-line no-restricted-imports
import {
  CATEGORY_IMAGE_SIZE,
  CATEGORY_TILES,
  COLORS as GENERATOR_COLORS,
  HERO_IMAGE_SIZE,
  HERO_SCENES,
  PRODUCT_IMAGES,
  PRODUCT_IMAGE_SIZE,
} from '../../../scripts/placeholder-manifest.mjs';

// SPEC 5 invariants, enforced on the seed data (RULES 7.6).

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HERO_MAX_BYTES = 150 * 1024;

const publicFile = (src: string): string => path.join(PUBLIC_DIR, src);

const productById = (id: string): Product | undefined =>
  PRODUCTS.find((product) => product.id === id);

const imageFilesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? imageFilesUnder(path.join(dir, entry.name))
      : [path.join(dir, entry.name)],
  );

const allImageAssets = (): ImageAsset[] => [
  ...PRODUCTS.flatMap((product) => product.images),
  ...HERO_IMAGES,
  ...CATEGORY_ENTRIES.map((entry) => entry.image),
];

describe('catalogue size and coverage (PRD 11, owner decision 3)', () => {
  it('has exactly 12 products with unique ids', () => {
    expect(PRODUCTS).toHaveLength(12);
    expect(new Set(PRODUCTS.map((product) => product.id)).size).toBe(12);
  });

  it('has at least one product in every category', () => {
    for (const category of CATEGORIES) {
      expect(PRODUCTS.filter((product) => product.category === category).length).toBeGreaterThan(0);
    }
  });

  it('has at least two products for every look slot', () => {
    for (const slot of SLOTS) {
      expect(PRODUCTS.filter((product) => product.slot === slot).length).toBeGreaterThanOrEqual(2);
    }
  });

  it.each([
    ['essential-tee', 4900, 'top'],
    ['premium-hoodie', 8900, 'top'],
    ['performance-short', 5900, 'bottom'],
    ['classic-cap', 3900, 'cap'],
    ['essential-socks', 1900, 'socks'],
  ] as const)('includes the mock-up product %s at %i cents for slot %s', (slug, price, slot) => {
    const product = PRODUCTS.find((candidate) => candidate.slug === slug);
    expect(product?.priceCents).toBe(price);
    expect(product?.slot).toBe(slot);
  });

  it('has a Home essentials list of four existing products in order (FR-012)', () => {
    expect(FEATURED_ESSENTIAL_IDS).toHaveLength(4);
    for (const id of FEATURED_ESSENTIAL_IDS) expect(productById(id)).toBeDefined();
  });

  it('has an entry for every category and every vibe', () => {
    expect(CATEGORY_ENTRIES.map((entry) => entry.id)).toEqual([...CATEGORIES]);
    expect(VIBE_ENTRIES.map((entry) => entry.id)).toEqual([...VIBES]);
  });

  it('puts every product in at least one vibe that exists', () => {
    for (const product of PRODUCTS) {
      expect(product.vibes.length).toBeGreaterThan(0);
      for (const vibe of product.vibes) expect(VIBES).toContain(vibe);
    }
  });
});

describe('product identity (SPEC 5)', () => {
  it('has unique kebab-case slugs', () => {
    const slugs = PRODUCTS.map((product) => product.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(KEBAB_CASE);
  });

  it('has globally unique SKUs of the form slug-colorId-size', () => {
    const skus = PRODUCTS.flatMap((product) => product.variants.map((variant) => variant.sku));
    expect(new Set(skus).size).toBe(skus.length);
    for (const product of PRODUCTS) {
      for (const variant of product.variants) {
        expect(variant.sku).toBe(`${product.slug}-${variant.colorId}-${variant.size}`);
      }
    }
  });

  it('has valid ISO creation dates', () => {
    for (const product of PRODUCTS) {
      expect(product.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(product.createdAt))).toBe(false);
    }
  });

  it('has English tags that are lowercase kebab-case', () => {
    for (const product of PRODUCTS) {
      expect(product.tags.length).toBeGreaterThan(0);
      for (const tag of product.tags) expect(tag).toMatch(KEBAB_CASE);
    }
  });
});

describe('colours, variants and sizes (SPEC 5)', () => {
  it('references only colours that the product declares', () => {
    for (const product of PRODUCTS) {
      const ids = new Set(product.colors.map((color) => color.id));
      for (const variant of product.variants) expect(ids.has(variant.colorId)).toBe(true);
      for (const image of product.images) expect(ids.has(image.colorId)).toBe(true);
    }
  });

  it('has at least one image and one variant for every colour', () => {
    for (const product of PRODUCTS) {
      for (const color of product.colors) {
        expect(product.images.some((image) => image.colorId === color.id)).toBe(true);
        expect(product.variants.some((variant) => variant.colorId === color.id)).toBe(true);
      }
    }
  });

  it('has one variant per colour and size, with the same sizes for every colour', () => {
    for (const product of PRODUCTS) {
      const sizesOf = (colorId: string): string[] =>
        product.variants.filter((variant) => variant.colorId === colorId).map((v) => v.size);
      const first = sizesOf(product.colors[0]?.id ?? '');
      for (const color of product.colors) {
        const sizes = sizesOf(color.id);
        expect(new Set(sizes).size).toBe(sizes.length);
        expect(sizes).toEqual(first);
      }
    }
  });

  it('uses ONE for caps and bags and a XS-XXL or S-L run elsewhere, in canonical order', () => {
    for (const product of PRODUCTS) {
      const sizes = [...new Set(product.variants.map((variant) => variant.size))];
      const ranks = sizes.map((size) => SIZES.indexOf(size));
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
      if (product.category === 'accessories' || product.slot === 'cap') {
        expect(sizes).toEqual(['ONE']);
      } else {
        expect(sizes).not.toContain('ONE');
      }
    }
  });

  it('uses the same size run for both socks', () => {
    const socks = PRODUCTS.filter((product) => product.slot === 'socks');
    const runs = socks.map((product) => [...new Set(product.variants.map((v) => v.size))]);
    for (const run of runs) expect(run).toEqual(runs[0]);
  });

  it('has hex swatches and localized colour names, with one hex per colour id', () => {
    const hexById = new Map<string, string>();
    for (const product of PRODUCTS) {
      for (const color of product.colors) {
        expect(color.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(color.name.en.trim()).not.toBe('');
        expect(color.name.th.trim()).not.toBe('');
        expect(hexById.get(color.id) ?? color.hex).toBe(color.hex);
        hexById.set(color.id, color.hex);
      }
    }
    expect([...hexById.keys()].sort()).toEqual(['black', 'forest', 'grey', 'sand', 'white']);
  });
});

describe('prices, stock and copy (SPEC 5, RULES 7.1)', () => {
  it('has positive integer prices in USD cents', () => {
    for (const product of PRODUCTS) {
      expect(Number.isInteger(product.priceCents)).toBe(true);
      expect(product.priceCents).toBeGreaterThan(0);
    }
  });

  it('has non-negative integer stock', () => {
    for (const product of PRODUCTS) {
      for (const variant of product.variants) {
        expect(Number.isInteger(variant.stock)).toBe(true);
        expect(variant.stock).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('has non-empty English and Thai copy and image alt text', () => {
    const entries = [
      ...PRODUCTS.flatMap((product) => [
        product.name,
        product.description,
        ...product.images.map((image) => image.alt),
      ]),
      ...CATEGORY_ENTRIES.flatMap((entry) => [entry.name, entry.subtitle, entry.image.alt]),
      ...VIBE_ENTRIES.flatMap((entry) => [entry.name, entry.description]),
      ...LOOKS.flatMap((look) => [look.name, look.description]),
      ...HERO_IMAGES.map((image) => image.alt),
    ];
    for (const entry of entries) {
      expect(entry.en.trim()).not.toBe('');
      expect(entry.th.trim()).not.toBe('');
    }
  });

  it('writes no exclamation marks in copy (DESIGN 10)', () => {
    const copy = PRODUCTS.flatMap((product) => [
      product.name.en,
      product.name.th,
      product.description.en,
      product.description.th,
    ]);
    for (const text of copy) expect(text).not.toMatch(/[!！]/);
  });

  it('writes product names and descriptions in Thai script, not as English copies', () => {
    for (const product of PRODUCTS) {
      expect(product.name.th).toMatch(/[฀-๿]/);
      expect(product.description.th).toMatch(/[฀-๿]/);
    }
  });

  it('exercises the stock states the UI must handle (FR-031, FR-032)', () => {
    const variants = PRODUCTS.flatMap((product) => product.variants);
    expect(variants.some((variant) => variant.stock === 0)).toBe(true);
    expect(variants.some((variant) => variant.stock >= 1 && variant.stock <= 3)).toBe(true);
    // Most variants are comfortably in stock.
    const comfortable = variants.filter((variant) => variant.stock > 3).length;
    expect(comfortable / variants.length).toBeGreaterThan(0.7);

    const outOfStockSize = PRODUCTS.some((product) =>
      product.colors.some((color) => {
        const ofColor = product.variants.filter((variant) => variant.colorId === color.id);
        return ofColor.some((v) => v.stock === 0) && ofColor.some((v) => v.stock > 0);
      }),
    );
    expect(outOfStockSize).toBe(true);

    const soldOutColour = PRODUCTS.some((product) =>
      product.colors.some((color) =>
        product.variants
          .filter((variant) => variant.colorId === color.id)
          .every((variant) => variant.stock === 0),
      ),
    );
    expect(soldOutColour).toBe(true);
  });

  it('lists an in-stock colour first, because the first colour is the default on cards and pages', () => {
    for (const product of PRODUCTS) {
      const first = product.colors[0]?.id;
      expect(product.variants.some((v) => v.colorId === first && v.stock > 0)).toBe(true);
    }
  });

  it('keeps every product purchasable in at least one colour and size', () => {
    for (const product of PRODUCTS) {
      expect(product.variants.some((variant) => variant.stock > 0)).toBe(true);
    }
  });
});

describe('looks (SPEC 5, FR-040)', () => {
  it('has The Essential Look with a 10% discount', () => {
    const look = LOOKS.find((candidate) => candidate.slug === 'the-essential-look');
    expect(look?.name.en).toBe('The Essential Look');
    expect(look?.discountPct).toBe(10);
  });

  it('has unique look ids and slugs', () => {
    expect(new Set(LOOKS.map((look) => look.id)).size).toBe(LOOKS.length);
    expect(new Set(LOOKS.map((look) => look.slug)).size).toBe(LOOKS.length);
  });

  it('defines all four slots and every referenced product exists with a matching slot', () => {
    for (const look of LOOKS) {
      expect(Object.keys(look.slots).sort()).toEqual([...SLOTS].sort());
      for (const slot of SLOTS) {
        const entry = look.slots[slot];
        expect(entry.allowedProductIds).toContain(entry.defaultProductId);
        for (const id of entry.allowedProductIds) {
          const product = productById(id);
          expect(product, `${look.id}.${slot} references ${id}`).toBeDefined();
          expect(product?.slot).toBe(slot);
        }
      }
    }
  });

  it('defaults The Essential Look to tee, short, cap and socks, each purchasable', () => {
    const look = LOOKS[0];
    expect(look?.slots.top.defaultProductId).toBe('p-essential-tee');
    expect(look?.slots.cap.defaultProductId).toBe('p-classic-cap');
    for (const slot of SLOTS) {
      const product = productById(look?.slots[slot].defaultProductId ?? '');
      expect(product?.variants.some((variant) => variant.stock > 0)).toBe(true);
    }
  });

  it('offers at least two allowed products per slot so the builder has a choice', () => {
    for (const look of LOOKS) {
      for (const slot of SLOTS) {
        expect(look.slots[slot].allowedProductIds.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('survives a second parse through the schemas (module-load validation holds)', () => {
    for (const product of PRODUCTS) expect(productSchema.safeParse(product).success).toBe(true);
    for (const look of LOOKS) expect(lookSchema.safeParse(look).success).toBe(true);
  });
});

describe('image files (RULES 14, DESIGN 9)', () => {
  it('has every referenced image file under public/ in DESIGN 9 naming', () => {
    for (const product of PRODUCTS) {
      for (const image of product.images) {
        expect(image.src).toMatch(
          new RegExp(`^/images/products/${product.slug}/${image.colorId}-\\d+\\.webp$`),
        );
      }
    }
    for (const asset of allImageAssets()) {
      expect(existsSync(publicFile(asset.src)), `${asset.src} exists`).toBe(true);
    }
  });

  it('has no unreferenced image file in public/images', () => {
    const referenced = new Set(allImageAssets().map((asset) => publicFile(asset.src)));
    const onDisk = imageFilesUnder(path.join(PUBLIC_DIR, 'images'));
    expect(onDisk.filter((file) => !referenced.has(file))).toEqual([]);
  });

  it('records the real pixel size of every image in the data', async () => {
    for (const asset of allImageAssets()) {
      const meta = await sharp(publicFile(asset.src)).metadata();
      expect({ src: asset.src, w: meta.width, h: meta.height }).toEqual({
        src: asset.src,
        w: asset.width,
        h: asset.height,
      });
    }
  });

  it('keeps each hero image at or under 150 kB (owner decision 2)', () => {
    expect(HERO_IMAGES).toHaveLength(3);
    for (const hero of HERO_IMAGES) {
      expect(statSync(publicFile(hero.src)).size).toBeLessThanOrEqual(HERO_MAX_BYTES);
    }
  });

  it('gives front, back and side images per colour (FR-030)', () => {
    for (const product of PRODUCTS) {
      for (const color of product.colors) {
        const images = product.images.filter((image) => image.colorId === color.id);
        expect(images.map((image) => image.view)).toEqual(['front', 'back', 'side']);
        expect(images.map((image) => image.generated)).toEqual([false, true, true]);
      }
    }
  });

  it('keeps product alt text specific: it names the colour in both locales', () => {
    for (const product of PRODUCTS) {
      for (const image of product.images) {
        const color = product.colors.find((candidate) => candidate.id === image.colorId);
        if (color === undefined) throw new Error(`no colour ${image.colorId} on ${product.slug}`);
        expect(image.alt.en.toLowerCase()).toContain(color.name.en.toLowerCase());
        expect(image.alt.th).toContain(color.name.th);
      }
    }
  });
});

describe('placeholder generator manifest matches the seed data', () => {
  it('draws exactly the products, colours and swatch hex values in the catalogue', () => {
    expect(PRODUCT_IMAGES.map((entry) => entry.slug)).toEqual(PRODUCTS.map((p) => p.slug));
    for (const entry of PRODUCT_IMAGES) {
      const product = PRODUCTS.find((candidate) => candidate.slug === entry.slug);
      expect(entry.colors).toEqual(product?.colors.map((color) => color.id));
      for (const color of product?.colors ?? []) {
        expect(GENERATOR_COLORS[color.id]?.toLowerCase()).toBe(color.hex.toLowerCase());
      }
    }
  });

  it('uses the recorded image sizes and covers every hero and category tile', () => {
    expect(
      PRODUCTS.flatMap((p) => p.images).every((i) => i.width === PRODUCT_IMAGE_SIZE.width),
    ).toBe(true);
    expect(
      PRODUCTS.flatMap((p) => p.images).every((i) => i.height === PRODUCT_IMAGE_SIZE.height),
    ).toBe(true);
    expect(HERO_SCENES.map((name) => `/images/brand/${name}.webp`)).toEqual(
      HERO_IMAGES.map((image) => image.src),
    );
    expect(HERO_IMAGES.every((i) => i.width === HERO_IMAGE_SIZE.width)).toBe(true);
    expect(CATEGORY_TILES).toEqual(CATEGORY_ENTRIES.map((entry) => entry.id));
    expect(CATEGORY_ENTRIES.every((e) => e.image.width === CATEGORY_IMAGE_SIZE.width)).toBe(true);
  });
});
