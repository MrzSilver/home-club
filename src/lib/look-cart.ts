import type { CartLine, Look, Product } from '@/data/schema';
import { SLOTS } from '@/data/taxonomy';
import { convertFromUsdCents, percentOf, type Currency } from '@/lib/money';

type PriceProduct = Pick<Product, 'priceCents' | 'variants'> &
  Partial<Pick<Product, 'id' | 'slot'>>;
export type LookCartGroup = { lookId: string; complete: boolean; discountCents: number };

/** Only complete, currently permitted sets earn a discount; extra units keep their list price. */
export function priceLookCart(
  lines: readonly CartLine[],
  products: readonly PriceProduct[],
  looks: readonly Look[],
  currency: Currency,
): { subtotalCents: number; discountCents: number; totalCents: number; groups: LookCartGroup[] } {
  const rows = lines.flatMap((line) => {
    const product = products.find((p) => p.variants.some((v) => v.sku === line.sku));
    return product
      ? [{ ...line, product, unit: convertFromUsdCents(product.priceCents, currency) }]
      : [];
  });
  const subtotalCents = rows.reduce((sum, row) => sum + row.unit * row.qty, 0);
  const groups = [...new Set(lines.flatMap((l) => (l.lookId ? [l.lookId] : [])))].map((lookId) => {
    const look = looks.find((l) => l.id === lookId);
    const members = rows.filter((row) => row.lookId === lookId);
    const slotRows = SLOTS.map((slot) =>
      members.filter(
        (row) =>
          row.product.slot === slot &&
          row.product.id !== undefined &&
          look?.slots[slot].allowedProductIds.includes(row.product.id),
      ),
    );
    const sets = look
      ? Math.min(...slotRows.map((matches) => matches.reduce((sum, row) => sum + row.qty, 0)))
      : 0;
    const complete = sets > 0;
    // Pair units deterministically across variants without storing prices or transient instance IDs.
    const base = slotRows.reduce((sum, matches) => {
      let remaining = sets;
      return (
        sum +
        matches
          .toSorted((a, b) => a.sku.localeCompare(b.sku))
          .reduce((slotTotal, row) => {
            const qty = Math.min(row.qty, remaining);
            remaining -= qty;
            return slotTotal + row.unit * qty;
          }, 0)
      );
    }, 0);
    return {
      lookId,
      complete,
      discountCents: complete && look ? percentOf(base, look.discountPct, currency) : 0,
    };
  });
  const discountCents = groups.reduce((sum, group) => sum + group.discountCents, 0);
  return { subtotalCents, discountCents, totalCents: subtotalCents - discountCents, groups };
}
