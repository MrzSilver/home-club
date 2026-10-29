import type { CartLine, Look, Product, Slot, Variant } from '@/data/schema';
import { SLOTS } from '@/data/taxonomy';
import type { DiscountedTotal } from '@/lib/pricing';
import { convertFromUsdCents, percentOf, type Currency } from '@/lib/money';

export type LookChoice = { productId: string; colorId: string; size: string };
export type LookSelection = Record<Slot, LookChoice>;
export type SlotError = { slot: Slot; reason: 'product' | 'variant' | 'stock' };
export type LookAlternative = { product: Product; variant: Variant };

function resolve(choice: LookChoice, products: readonly Product[]): LookAlternative | undefined {
  const product = products.find((p) => p.id === choice.productId);
  const variant = product?.variants.find(
    (v) => v.colorId === choice.colorId && v.size === choice.size,
  );
  return product && variant ? { product, variant } : undefined;
}

export function findAlternatives(
  slot: Slot,
  look: Look,
  products: readonly Product[],
): LookAlternative[] {
  return products
    .filter((p) => p.slot === slot && look.slots[slot].allowedProductIds.includes(p.id))
    .flatMap((product) =>
      product.variants.filter((v) => v.stock > 0).map((variant) => ({ product, variant })),
    );
}

export function createLookSelection(look: Look, products: readonly Product[]): LookSelection {
  const choose = (slot: Slot): LookChoice => {
    const alternatives = findAlternatives(slot, look, products);
    const option =
      alternatives.find((a) => a.product.id === look.slots[slot].defaultProductId) ??
      alternatives[0];
    const product = products.find((p) => p.id === look.slots[slot].defaultProductId);
    const variant = product?.variants[0];
    return option
      ? { productId: option.product.id, colorId: option.variant.colorId, size: option.variant.size }
      : {
          productId: product?.id ?? '',
          colorId: variant?.colorId ?? '',
          size: variant?.size ?? '',
        };
  };
  return {
    top: choose('top'),
    bottom: choose('bottom'),
    cap: choose('cap'),
    socks: choose('socks'),
  };
}

export function validateSelection(
  look: Look,
  selection: LookSelection,
  products: readonly Product[],
): { ok: true } | { ok: false; errors: SlotError[] } {
  const errors: SlotError[] = [];
  for (const slot of SLOTS) {
    const choice = selection[slot];
    const product = products.find((p) => p.id === choice.productId);
    if (
      !product ||
      product.slot !== slot ||
      !look.slots[slot].allowedProductIds.includes(product.id)
    )
      errors.push({ slot, reason: 'product' });
    else {
      const match = resolve(choice, products);
      if (!match) errors.push({ slot, reason: 'variant' });
      else if (match.variant.stock < 1) errors.push({ slot, reason: 'stock' });
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function priceLook(
  selection: LookSelection,
  discountPct: number,
  products: readonly Product[],
  currency: Currency,
): DiscountedTotal {
  const lines = SLOTS.map((slot) => {
    const product = products.find((p) => p.id === selection[slot].productId);
    if (!product) throw new RangeError(`Invalid ${slot} selection`);
    return { unitCents: convertFromUsdCents(product.priceCents, currency), qty: 1 };
  });
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitCents, 0);
  const discountCents = percentOf(subtotalCents, discountPct, currency);
  return { subtotalCents, discountCents, totalCents: subtotalCents - discountCents };
}

export function toCartLines(
  selection: LookSelection,
  lookId: string,
  products: readonly Product[],
): CartLine[] {
  return SLOTS.map((slot) => {
    const match = resolve(selection[slot], products);
    if (!match) throw new RangeError(`Invalid ${slot} selection`);
    return { sku: match.variant.sku, qty: 1, lookId };
  });
}
