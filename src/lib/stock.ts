import type { Product, Size, Variant } from '@/data/schema';
import { MAX_QTY_PER_LINE, SIZES } from '@/data/taxonomy';

// Re-exported so the cart cap has one definition shared with the CartLine schema (RULES 7.4).
export { MAX_QTY_PER_LINE };

// FR-032: show a "low stock" label when 1 to 3 units are left.
export const LOW_STOCK_THRESHOLD = 3;

export type UnavailableReason = 'out-of-stock' | 'not-offered';

export interface OptionAvailability<T> {
  value: T;
  available: boolean;
  // Why the option is disabled, so the UI can announce it (FR-031); null when available.
  reason: UnavailableReason | null;
  // Units left across the variants that back this option (0 when unavailable).
  stock: number;
}

export function findVariant(
  product: Pick<Product, 'variants'>,
  colorId: string,
  size: string,
): Variant | undefined {
  return product.variants.find((variant) => variant.colorId === colorId && variant.size === size);
}

export function isInStock(variant: Pick<Variant, 'stock'> | undefined): boolean {
  return variant !== undefined && variant.stock > 0;
}

/** True when no variant of the product has stock: the card says "Sold out" instead of inviting a click. */
export function isSoldOut(product: Pick<Product, 'variants'>): boolean {
  return !product.variants.some(isInStock);
}

export function isLowStock(variant: Pick<Variant, 'stock'> | undefined): boolean {
  return variant !== undefined && variant.stock >= 1 && variant.stock <= LOW_STOCK_THRESHOLD;
}

export function maxQtyFor(variant: Pick<Variant, 'stock'> | undefined): number {
  if (variant === undefined) return 0;
  return Math.min(variant.stock, MAX_QTY_PER_LINE);
}

/**
 * Clamps a requested quantity to what can be bought (RULES 7.4): an integer in [1, maxQtyFor], or 0
 * when the variant is out of stock or unknown (the caller then removes the line / blocks the add).
 * Fractions are truncated, NaN and values below 1 become 1, and an unbounded request (Infinity)
 * clamps to the maximum, so a bad input never yields 0 for an in-stock variant.
 */
export function clampQty(qty: number, variant: Pick<Variant, 'stock'> | undefined): number {
  const max = maxQtyFor(variant);
  if (max === 0) return 0;
  const whole = Number.isNaN(qty) ? 1 : Math.trunc(qty);
  return Math.min(Math.max(whole, 1), max);
}

/**
 * The colour to preselect: the first one, in data order, that has any stock. Falls back to the first
 * colour when everything is sold out so the product page still has a selection; undefined only for a
 * product without colours, which the schema forbids.
 */
export function defaultColorFor(product: Pick<Product, 'colors' | 'variants'>): string | undefined {
  const inStock = product.colors.find((color) =>
    product.variants.some((variant) => variant.colorId === color.id && isInStock(variant)),
  );
  return (inStock ?? product.colors[0])?.id;
}

const toAvailability = <T>(value: T, variants: readonly Variant[]): OptionAvailability<T> => {
  const stock = variants.reduce((sum, variant) => sum + variant.stock, 0);
  if (variants.length === 0) return { value, available: false, reason: 'not-offered', stock: 0 };
  if (stock === 0) return { value, available: false, reason: 'out-of-stock', stock: 0 };
  return { value, available: true, reason: null, stock };
};

const sizeRank = (size: Size): number => SIZES.indexOf(size);

/** Sizes the product is sold in, canonical order, for a chosen colour (FR-031). */
export function availableSizesFor(
  product: Pick<Product, 'variants'>,
  colorId: string,
): OptionAvailability<Size>[] {
  const sizes = [...new Set(product.variants.map((variant) => variant.size))].sort(
    (a, b) => sizeRank(a) - sizeRank(b),
  );
  return sizes.map((size) =>
    toAvailability(
      size,
      product.variants.filter((variant) => variant.colorId === colorId && variant.size === size),
    ),
  );
}

/**
 * Colours of the product in data order. With a size chosen, a colour is available when that exact
 * colour x size variant is in stock; with `size === null`, when any of its sizes is in stock.
 */
export function availableColorsFor(
  product: Pick<Product, 'colors' | 'variants'>,
  size: Size | null,
): OptionAvailability<string>[] {
  return product.colors.map((color) =>
    toAvailability(
      color.id,
      product.variants.filter(
        (variant) => variant.colorId === color.id && (size === null || variant.size === size),
      ),
    ),
  );
}
