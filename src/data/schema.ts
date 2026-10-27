import { z } from 'zod';

import { LOCALES } from '@/data/locales';

export { LOCALES };

// Ordered const tuples are the single source for every literal union below (RULES 2.4: no enums).
export const CATEGORIES = ['foundations', 'performance', 'lifestyle', 'accessories'] as const;
export const VIBES = ['performance', 'outdoor', 'lazy', 'skate', 'hockey'] as const;
export const SLOTS = ['top', 'bottom', 'cap', 'socks'] as const;
// Canonical display order: apparel XS to XXL, then the one-size value.
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE'] as const;

// RULES 7.4 / SPEC 7.1: the cart cap. Lives next to CartLine so the schema and lib/stock share it.
export const MAX_QTY_PER_LINE = 10;

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
// Public image paths only: DESIGN 9 naming under /images, modern raster formats.
const IMAGE_PATH = /^\/images\/[a-z0-9][a-z0-9/_-]*\.(?:webp|avif|jpg)$/;

const kebabId = (): z.ZodString => z.string().regex(KEBAB_CASE);

export const localeSchema = z.enum(LOCALES);
export const categorySchema = z.enum(CATEGORIES);
export const vibeSchema = z.enum(VIBES);
export const slotSchema = z.enum(SLOTS);
export const sizeSchema = z.enum(SIZES);

export const localizedSchema = z.strictObject({
  en: z.string().trim().min(1),
  th: z.string().trim().min(1),
});

export const colorSchema = z.strictObject({
  id: kebabId(),
  name: localizedSchema,
  // Swatch only; never used for text contrast logic (SPEC 5).
  hex: z.string().regex(HEX_COLOR),
});

export const variantSchema = z.strictObject({
  sku: z.string().min(1),
  colorId: kebabId(),
  size: sizeSchema,
  stock: z.int().min(0),
});

export const imageAssetSchema = z.strictObject({
  src: z.string().regex(IMAGE_PATH),
  alt: localizedSchema,
  width: z.int().positive(),
  height: z.int().positive(),
});

export const productImageSchema = imageAssetSchema.extend({ colorId: kebabId() });

const hasDuplicates = (values: readonly string[]): boolean =>
  new Set(values).size !== values.length;

export const productSchema = z
  .strictObject({
    id: kebabId(),
    slug: kebabId(),
    category: categorySchema,
    slot: slotSchema.optional(),
    vibes: z.array(vibeSchema),
    name: localizedSchema,
    description: localizedSchema,
    // USD minor units (cents), integer > 0.
    priceCents: z.int().positive(),
    colors: z.array(colorSchema).min(1),
    variants: z.array(variantSchema).min(1),
    images: z.array(productImageSchema).min(1),
    tags: z.array(z.string().min(1)),
    createdAt: z.iso.date(),
  })
  .superRefine((product, ctx) => {
    const colorIds = product.colors.map((color) => color.id);
    if (hasDuplicates(colorIds)) {
      ctx.addIssue({ code: 'custom', path: ['colors'], message: 'duplicate colour id' });
    }
    if (hasDuplicates(product.variants.map((variant) => variant.sku))) {
      ctx.addIssue({ code: 'custom', path: ['variants'], message: 'duplicate sku' });
    }
    product.variants.forEach((variant, index) => {
      if (!colorIds.includes(variant.colorId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['variants', index, 'colorId'],
          message: `variant colour "${variant.colorId}" is not in product colors`,
        });
      }
      const expectedSku = `${product.slug}-${variant.colorId}-${variant.size}`;
      if (variant.sku !== expectedSku) {
        ctx.addIssue({
          code: 'custom',
          path: ['variants', index, 'sku'],
          message: `sku must be "${expectedSku}"`,
        });
      }
    });
    product.images.forEach((image, index) => {
      if (!colorIds.includes(image.colorId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['images', index, 'colorId'],
          message: `image colour "${image.colorId}" is not in product colors`,
        });
      }
    });
    for (const colorId of colorIds) {
      if (!product.images.some((image) => image.colorId === colorId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['images'],
          message: `colour "${colorId}" has no image`,
        });
      }
      if (!product.variants.some((variant) => variant.colorId === colorId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['variants'],
          message: `colour "${colorId}" has no variant`,
        });
      }
    }
  });

const lookSlotSchema = z
  .strictObject({
    defaultProductId: kebabId(),
    allowedProductIds: z.array(kebabId()).min(1),
  })
  .superRefine((entry, ctx) => {
    if (!entry.allowedProductIds.includes(entry.defaultProductId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['defaultProductId'],
        message: 'default product must be one of allowedProductIds',
      });
    }
    if (hasDuplicates(entry.allowedProductIds)) {
      ctx.addIssue({
        code: 'custom',
        path: ['allowedProductIds'],
        message: 'duplicate product id',
      });
    }
  });

export const lookSchema = z.strictObject({
  id: kebabId(),
  slug: kebabId(),
  name: localizedSchema,
  description: localizedSchema,
  slots: z.record(slotSchema, lookSlotSchema),
  discountPct: z.int().min(0).max(50),
});

export const cartLineSchema = z.strictObject({
  sku: z.string().min(1),
  qty: z.int().min(1).max(MAX_QTY_PER_LINE),
  lookId: z.string().min(1).optional(),
});

export const categoryEntrySchema = z.strictObject({
  id: categorySchema,
  name: localizedSchema,
  subtitle: localizedSchema,
  image: imageAssetSchema,
});

export const vibeEntrySchema = z.strictObject({
  id: vibeSchema,
  name: localizedSchema,
  description: localizedSchema,
});

export type Locale = z.infer<typeof localeSchema>;
export type Localized = z.infer<typeof localizedSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Vibe = z.infer<typeof vibeSchema>;
export type Slot = z.infer<typeof slotSchema>;
export type Size = z.infer<typeof sizeSchema>;
export type Color = z.infer<typeof colorSchema>;
export type Variant = z.infer<typeof variantSchema>;
export type ImageAsset = z.infer<typeof imageAssetSchema>;
export type ProductImage = z.infer<typeof productImageSchema>;
export type Product = z.infer<typeof productSchema>;
export type LookSlot = z.infer<typeof lookSlotSchema>;
export type Look = z.infer<typeof lookSchema>;
export type CartLine = z.infer<typeof cartLineSchema>;
export type CategoryEntry = z.infer<typeof categoryEntrySchema>;
export type VibeEntry = z.infer<typeof vibeEntrySchema>;
