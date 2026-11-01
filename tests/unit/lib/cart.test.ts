import { describe, expect, it } from 'vitest';
import { normalizeCart, addCartLine, reconcileCart } from '@/lib/cart';
import { parseSavedCart } from '@/lib/cart-schema';

const stock = { tee: 3, cap: 20, gone: 0 };
describe('cart invariants (FR-050, FR-051)', () => {
  it('drops unknown/sold out SKUs and clamps duplicate lines to current stock', () => {
    expect(
      normalizeCart(
        [
          { sku: 'tee', qty: 2 },
          { sku: 'tee', qty: 2 },
          { sku: 'cap', qty: 20 },
          { sku: 'gone', qty: 1 },
          { sku: 'missing', qty: 1 },
        ],
        stock,
      ),
    ).toEqual([
      { sku: 'tee', qty: 3 },
      { sku: 'cap', qty: 10 },
    ]);
  });
  it('never admits corrupt data, extra prices, malformed look groups or fractional quantities', () => {
    for (const input of [
      null,
      {},
      'x',
      [{ sku: 'tee', qty: 1.5 }],
      [{ sku: 'tee', qty: 2, price: 1 }],
      [{ sku: 'tee', qty: 1, lookId: '' }],
    ])
      expect(parseSavedCart({ version: 1, state: { lines: input } })).toBeNull();
  });
  it('accepts optional look membership without stored prices (FR-052)', () => {
    expect(
      parseSavedCart({
        version: 1,
        state: { lines: [{ sku: 'tee', qty: 1, lookId: 'look-essential' }] },
      })?.state.lines,
    ).toEqual([{ sku: 'tee', qty: 1, lookId: 'look-essential' }]);
  });
  it('merges repeated adds without exceeding stock; rejects unknown and invalid additions', () => {
    expect(addCartLine([{ sku: 'tee', qty: 2 }], 'tee', 2, stock)).toEqual([
      { sku: 'tee', qty: 3 },
    ]);
    for (const [sku, qty] of [
      ['missing', 1],
      ['gone', 1],
      ['tee', NaN],
      ['tee', 0],
    ] as const)
      expect(addCartLine([], sku, qty, stock)).toEqual([]);
  });
});

describe('reconcileCart (FR-051)', () => {
  const stock = { tee: 3, sold: 0 };
  it('reports unchanged for lines that need no repair', () => {
    expect(reconcileCart([{ sku: 'tee', qty: 2 }], stock)).toEqual({
      lines: [{ sku: 'tee', qty: 2 }],
      changed: false,
    });
  });
  it('reports unchanged for a valid cart mixing a look line and a regular line of the same SKU', () => {
    const lines = [
      { sku: 'tee', qty: 1 },
      { sku: 'tee', qty: 1, lookId: 'weekend' },
    ];
    expect(reconcileCart(lines, stock)).toEqual({ lines, changed: false });
  });
  it('reports changed when a line is dropped, clamped or merged', () => {
    expect(reconcileCart([{ sku: 'sold', qty: 1 }], stock).changed).toBe(true);
    expect(reconcileCart([{ sku: 'tee', qty: 9 }], stock)).toEqual({
      lines: [{ sku: 'tee', qty: 3 }],
      changed: true,
    });
    expect(
      reconcileCart(
        [
          { sku: 'tee', qty: 1 },
          { sku: 'tee', qty: 1 },
        ],
        stock,
      ).changed,
    ).toBe(true);
  });
});
