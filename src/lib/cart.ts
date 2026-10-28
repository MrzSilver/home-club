import type { CartLine } from '@/data/schema';
import { clampQty } from '@/lib/stock';

export type StockIndex = Readonly<Record<string, number>>;
/** Stock reconciliation for lines already validated at the storage boundary. */
export function normalizeCart(
  lines: readonly Pick<CartLine, 'sku' | 'qty'>[],
  stock: StockIndex,
): CartLine[] {
  const quantities = new Map<string, number>();
  for (const line of lines) {
    const available = Object.hasOwn(stock, line.sku) ? stock[line.sku] : 0;
    const qty = clampQty((quantities.get(line.sku) ?? 0) + line.qty, { stock: available ?? 0 });
    if (qty > 0) quantities.set(line.sku, qty);
  }
  return Array.from(quantities, ([sku, qty]) => ({ sku, qty }));
}

export function addCartLine(
  lines: CartLine[],
  sku: string,
  qty: number,
  stock: StockIndex,
): CartLine[] {
  if (!Number.isSafeInteger(qty) || qty < 1) return lines;
  return normalizeCart([...lines, { sku, qty }], stock);
}
