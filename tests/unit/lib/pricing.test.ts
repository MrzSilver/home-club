import { describe, expect, it } from 'vitest';
import { convertFromUsdCents } from '@/lib/money';
import {
  applyDiscount,
  discountCents,
  lineTotalCents,
  priceCartLines,
  subtotalCents,
} from '@/lib/pricing';

describe('line totals and subtotals (RULES 7.1)', () => {
  it('multiplies unit price by quantity in integer minor units', () => {
    expect(lineTotalCents(4900, 2)).toBe(9800);
    expect(lineTotalCents(0, 3)).toBe(0);
  });

  it.each([
    ['a zero quantity', 4900, 0],
    ['a fractional quantity', 4900, 1.5],
    ['a negative quantity', 4900, -1],
    ['NaN quantity', 4900, Number.NaN],
    ['a negative unit price', -1, 1],
    ['a fractional unit price', 49.5, 1],
  ])('rejects %s with a RangeError', (_label, unit, qty) => {
    expect(() => lineTotalCents(unit, qty)).toThrow(RangeError);
  });

  it('rejects a line total that would overflow a safe integer', () => {
    expect(() => lineTotalCents(Number.MAX_SAFE_INTEGER, 2)).toThrow(RangeError);
  });

  it('sums line totals, and an empty cart is zero', () => {
    expect(subtotalCents([])).toBe(0);
    expect(
      subtotalCents([
        { unitCents: 4900, qty: 2 },
        { unitCents: 1900, qty: 1 },
      ]),
    ).toBe(11_700);
  });

  it('rejects a subtotal that would overflow a safe integer', () => {
    const half = Math.floor(Number.MAX_SAFE_INTEGER / 2) + 1;
    expect(() =>
      subtotalCents([
        { unitCents: half, qty: 1 },
        { unitCents: half, qty: 1 },
      ]),
    ).toThrow(RangeError);
  });
});

describe('look discount (FR-042, SPEC 6)', () => {
  it('takes the percentage once on the set subtotal, never per line', () => {
    const lines = [
      { unitCents: 105, qty: 1 },
      { unitCents: 105, qty: 1 },
    ];
    const subtotal = subtotalCents(lines);
    // 10% of 210 is 21; rounding each 10.5 line would give 22.
    expect(discountCents(subtotal, 10)).toBe(21);
    expect(lines.reduce((sum, line) => sum + discountCents(line.unitCents, 10), 0)).toBe(22);
  });

  it('rounds halves away from zero', () => {
    expect(discountCents(4905, 10)).toBe(491);
    expect(discountCents(4895, 10)).toBe(490);
  });

  it('returns subtotal, discount and total that add up in USD', () => {
    const result = applyDiscount(16_600, 10);
    expect(result).toEqual({ subtotalCents: 16_600, discountCents: 1660, totalCents: 14_940 });
  });

  it('keeps THB discounts in whole baht so the total stays whole baht', () => {
    // tee + cap + socks = 3,745 baht; 10% is 374.5 baht -> 375 baht.
    const subtotal = [4900, 3900, 1900]
      .map((usd) => convertFromUsdCents(usd, 'THB'))
      .reduce((sum, value) => sum + value, 0);
    expect(subtotal).toBe(374_500);
    const result = applyDiscount(subtotal, 10, 'THB');
    expect(result.discountCents).toBe(37_500);
    expect(result.totalCents).toBe(337_000);
    expect(result.totalCents % 100).toBe(0);
    expect(result.discountCents + result.totalCents).toBe(result.subtotalCents);
  });

  it('applies no discount at 0 percent', () => {
    expect(applyDiscount(5000, 0)).toEqual({
      subtotalCents: 5000,
      discountCents: 0,
      totalCents: 5000,
    });
  });

  it('rejects invalid percentages', () => {
    expect(() => discountCents(1000, -5)).toThrow(RangeError);
    expect(() => discountCents(1000, 120)).toThrow(RangeError);
  });
});

describe('priceCartLines recomputes from catalogue data (RULES 7.3)', () => {
  it('prices lines from the catalogue in USD', () => {
    const cart = priceCartLines(
      [
        { sku: 'essential-tee-sand-M', qty: 2 },
        { sku: 'classic-cap-black-ONE', qty: 1 },
      ],
      'USD',
    );
    expect(cart.lines.map((line) => line.lineCents)).toEqual([9800, 3900]);
    expect(cart.subtotalCents).toBe(13_700);
    expect(cart.unknownSkus).toEqual([]);
    expect(cart.lines[0]).toMatchObject({ productId: 'p-essential-tee', unitCents: 4900, qty: 2 });
  });

  it('prices lines in satang when the display currency is THB', () => {
    const cart = priceCartLines([{ sku: 'essential-tee-sand-M', qty: 2 }], 'THB');
    expect(cart.lines[0]?.unitCents).toBe(171_500);
    expect(cart.subtotalCents).toBe(343_000);
  });

  it('ignores any price carried on the input line', () => {
    const tampered = { sku: 'essential-tee-sand-M', qty: 1, unitCents: 1, priceCents: 1 };
    expect(priceCartLines([tampered], 'USD').subtotalCents).toBe(4900);
  });

  it('reports unknown SKUs instead of pricing them', () => {
    const cart = priceCartLines(
      [
        { sku: 'retired-tee-sand-M', qty: 1 },
        { sku: 'essential-tee-black-L', qty: 1 },
      ],
      'USD',
    );
    expect(cart.unknownSkus).toEqual(['retired-tee-sand-M']);
    expect(cart.lines).toHaveLength(1);
    expect(cart.subtotalCents).toBe(4900);
  });
});
