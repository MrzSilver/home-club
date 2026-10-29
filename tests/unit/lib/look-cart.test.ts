import { describe, expect, it } from 'vitest';
import { addCartLine, addCartLinesAtomically, normalizeCart, setCartLineQty } from '@/lib/cart';

describe('atomic look cart batches (FR-043, FR-052)', () => {
  it('never steals stock already reserved by another group', () => {
    const lines = [
      { sku: 'tee', qty: 1 },
      { sku: 'tee', qty: 1, lookId: 'look' },
    ];
    expect(addCartLine(lines, 'tee', 1, { tee: 2 })).toEqual(lines);
    expect(setCartLineQty(lines, 'tee', 2, { tee: 2 })).toEqual(lines);
  });
  it('adds everything or leaves the original lines unchanged when any SKU is full', () => {
    const original = [{ sku: 'tee', qty: 2 }];
    const additions = [
      { sku: 'tee', qty: 1, lookId: 'look' },
      { sku: 'cap', qty: 1, lookId: 'look' },
    ];
    expect(addCartLinesAtomically(original, additions, { tee: 2, cap: 3 })).toBeNull();
    expect(original).toEqual([{ sku: 'tee', qty: 2 }]);
    expect(addCartLinesAtomically(original, additions, { tee: 3, cap: 3 })).toEqual([
      ...original,
      ...additions,
    ]);
    expect(addCartLinesAtomically([], [], {})).toBeNull();
    expect(addCartLinesAtomically([], [{ sku: 'tee', qty: NaN }], { tee: 3 })).toBeNull();
  });
  it('keeps look and regular purchases distinct but shares available stock', () => {
    expect(
      normalizeCart(
        [
          { sku: 'tee', qty: 2 },
          { sku: 'tee', qty: 2, lookId: 'look' },
        ],
        { tee: 3 },
      ),
    ).toEqual([
      { sku: 'tee', qty: 2 },
      { sku: 'tee', qty: 1, lookId: 'look' },
    ]);
  });
});
