import { findVariantBySku } from '@/lib/catalogue';
import { convertFromUsdCents, percentOf, assertMinorUnits, type Currency } from '@/lib/money';
import type { CartLine } from '@/data/schema';

// All amounts here are integer minor units of one display currency (cents for USD, satang for THB).
// Names keep the "Cents" suffix from the spec; callers convert each catalogue unit price once with
// `convertFromUsdCents` and then work in that currency.

export interface PriceableLine {
  unitCents: number;
  qty: number;
}

export interface DiscountedTotal {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

export interface PricedLine {
  sku: string;
  productId: string;
  qty: number;
  unitCents: number;
  lineCents: number;
}

export interface PricedCart {
  lines: PricedLine[];
  // SKUs that no longer exist in the catalogue (stale persisted cart); they are not priced.
  unknownSkus: string[];
  subtotalCents: number;
}

function assertSafeSum(value: number, label: string): number {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${label} overflows a safe integer`);
  return value;
}

export function lineTotalCents(unitCents: number, qty: number): number {
  assertMinorUnits(unitCents, 'unitCents');
  if (!Number.isSafeInteger(qty) || qty < 1) {
    throw new RangeError(`qty must be a positive integer, received ${qty}`);
  }
  return assertSafeSum(unitCents * qty, 'line total');
}

export function subtotalCents(lines: readonly PriceableLine[]): number {
  return lines.reduce(
    (sum, line) => assertSafeSum(sum + lineTotalCents(line.unitCents, line.qty), 'subtotal'),
    0,
  );
}

/** Discount applied once on the set subtotal, never per line (SPEC 6). Rounds half away from zero. */
export function discountCents(subtotal: number, pct: number, currency: Currency = 'USD'): number {
  return percentOf(subtotal, pct, currency);
}

export function applyDiscount(
  subtotal: number,
  pct: number,
  currency: Currency = 'USD',
): DiscountedTotal {
  const discount = discountCents(subtotal, pct, currency);
  return { subtotalCents: subtotal, discountCents: discount, totalCents: subtotal - discount };
}

/**
 * Prices cart lines from catalogue data only (RULES 7.3): the input carries a SKU and a quantity, so
 * a stored or tampered price can never reach the total. Lines whose SKU is gone are reported, not
 * priced.
 */
export function priceCartLines(
  lines: readonly Pick<CartLine, 'sku' | 'qty'>[],
  currency: Currency,
): PricedCart {
  const priced: PricedLine[] = [];
  const unknownSkus: string[] = [];
  for (const line of lines) {
    const match = findVariantBySku(line.sku);
    if (match === undefined) {
      unknownSkus.push(line.sku);
      continue;
    }
    const unitCents = convertFromUsdCents(match.product.priceCents, currency);
    priced.push({
      sku: line.sku,
      productId: match.product.id,
      qty: line.qty,
      unitCents,
      lineCents: lineTotalCents(unitCents, line.qty),
    });
  }
  return { lines: priced, unknownSkus, subtotalCents: subtotalCents(priced) };
}
