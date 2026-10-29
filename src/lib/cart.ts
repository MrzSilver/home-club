import type { CartLine } from '@/data/schema';
import { clampQty } from '@/lib/stock';

export type StockIndex = Readonly<Record<string, number>>;
/** Stock reconciliation for lines already validated at the storage boundary. */
export function normalizeCart(lines: readonly CartLine[], stock: StockIndex): CartLine[] {
  const quantities = new Map<string, CartLine>();
  const reserved = new Map<string, number>();
  for (const line of lines) {
    const available = Object.hasOwn(stock, line.sku) ? Math.min(stock[line.sku] ?? 0, 10) : 0;
    const key = cartLineKey(line);
    const previous = quantities.get(key)?.qty ?? 0;
    const capacity = Math.max(0, (available ?? 0) - (reserved.get(line.sku) ?? 0) + previous);
    const qty = clampQty(previous + line.qty, { stock: capacity });
    if (qty > 0) {
      quantities.set(key, { sku: line.sku, qty, ...(line.lookId ? { lookId: line.lookId } : {}) });
      reserved.set(line.sku, (reserved.get(line.sku) ?? 0) + qty - previous);
    }
  }
  return [...quantities.values()];
}

export function cartLineKey(line: Pick<CartLine, 'sku' | 'lookId'>): string {
  return JSON.stringify([line.sku, line.lookId ?? null]);
}

/** Reject the whole batch rather than silently clamping any member of a set. */
export function addCartLinesAtomically(
  lines: CartLine[],
  additions: readonly CartLine[],
  stock: StockIndex,
): CartLine[] | null {
  if (
    additions.length === 0 ||
    additions.some((line) => !Number.isSafeInteger(line.qty) || line.qty < 1)
  )
    return null;
  const requested = new Map<string, number>();
  for (const line of [...lines, ...additions])
    requested.set(line.sku, (requested.get(line.sku) ?? 0) + line.qty);
  for (const [sku, qty] of requested) {
    if (!Object.hasOwn(stock, sku) || qty > Math.min(stock[sku] ?? 0, 10)) return null;
  }
  return normalizeCart([...lines, ...additions], stock);
}

export function addCartLine(
  lines: CartLine[],
  sku: string,
  qty: number,
  stock: StockIndex,
): CartLine[] {
  if (!Number.isSafeInteger(qty) || qty < 1) return lines;
  const current = lines.find((line) => line.sku === sku && line.lookId === undefined)?.qty ?? 0;
  return setCartLineQty(lines, sku, current + qty, stock);
}

export function setCartLineQty(
  lines: CartLine[],
  sku: string,
  requested: number,
  stock: StockIndex,
  lookId?: string,
): CartLine[] {
  const capacity = availableQtyForLine(lines, sku, stock, lookId);
  const qty = clampQty(Number.isFinite(requested) ? Math.max(1, Math.trunc(requested)) : 1, {
    stock: capacity,
  });
  const existing = lines.some((line) => line.sku === sku && line.lookId === lookId);
  const updated = lines.flatMap((line) =>
    line.sku === sku && line.lookId === lookId ? (qty > 0 ? [{ ...line, qty }] : []) : [line],
  );
  if (!existing && qty > 0) updated.push({ sku, qty, ...(lookId ? { lookId } : {}) });
  return normalizeCart(updated, stock);
}

/** The quantity picker and mutations use the same capacity after other groups reserve stock. */
export function availableQtyForLine(
  lines: readonly CartLine[],
  sku: string,
  stock: StockIndex,
  lookId?: string,
): number {
  const otherQty = lines
    .filter((line) => line.sku === sku && line.lookId !== lookId)
    .reduce((sum, line) => sum + line.qty, 0);
  return Object.hasOwn(stock, sku) ? Math.max(0, Math.min(stock[sku] ?? 0, 10) - otherQty) : 0;
}
