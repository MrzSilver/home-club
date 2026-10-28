import { describe, expect, it } from 'vitest';
import {
  FX_USD_THB,
  ceilToWholeUnits,
  convertFromUsdCents,
  convertWholeUnits,
  floorToWholeUnits,
  currencySymbol,
  formatMoney,
  percentOf,
  roundHalfAwayFromZero,
  wholeUnitsToMinor,
} from '@/lib/money';

describe('roundHalfAwayFromZero (FR-072, RULES 7.2)', () => {
  it.each([
    [5, 2, 3],
    [-5, 2, -3],
    [1, 2, 1],
    [-1, 2, -1],
    [1, 3, 0],
    [2, 3, 1],
    [-2, 3, -1],
    [7, 2, 4],
    [0, 5, 0],
    [350, 100, 4],
    [349, 100, 3],
    [-350, 100, -4],
  ])('rounds %i / %i to %i, halves away from zero', (numerator, denominator, expected) => {
    expect(roundHalfAwayFromZero(numerator, denominator)).toBe(expected);
  });

  it('never returns negative zero', () => {
    expect(Object.is(roundHalfAwayFromZero(-1, 3), 0)).toBe(true);
  });

  it('matches exact BigInt arithmetic for a deterministic spread of large operands', () => {
    // Linear congruential generator keeps the spread deterministic (RULES 12.4).
    let state = 123456789n;
    const next = (modulus: bigint): bigint => {
      state = (state * 6364136223846793005n + 1442695040888963407n) % 2n ** 63n;
      return state % modulus;
    };
    for (let index = 0; index < 300; index += 1) {
      const numerator = next(4_000_000_000_000_000n);
      const denominator = next(1_000_000_000_000n) + 1n;
      const expected = (2n * numerator + denominator) / (2n * denominator);
      expect(roundHalfAwayFromZero(Number(numerator), Number(denominator))).toBe(Number(expected));
    }
  });

  it.each([
    ['a fractional numerator', 1.5, 2],
    ['a fractional denominator', 1, 2.5],
    ['NaN', Number.NaN, 2],
    ['a zero denominator', 1, 0],
    ['a negative denominator', 1, -2],
    ['an unsafe numerator', Number.MAX_SAFE_INTEGER + 1, 2],
  ])('rejects %s with a RangeError', (_label, numerator, denominator) => {
    expect(() => roundHalfAwayFromZero(numerator, denominator)).toThrow(RangeError);
  });

  it('rejects operands whose exact rounding would overflow a safe integer', () => {
    expect(() => roundHalfAwayFromZero(Number.MAX_SAFE_INTEGER, 3)).toThrow(RangeError);
  });
});

describe('convertFromUsdCents (FR-072, SPEC 6)', () => {
  it('uses a fixed demo rate of 35 THB per USD', () => {
    expect(FX_USD_THB).toBe(35);
  });

  it('leaves USD cents unchanged', () => {
    expect(convertFromUsdCents(4900, 'USD')).toBe(4900);
  });

  it.each([
    [4900, 171_500], // $49 -> 1,715 baht, in satang
    [8900, 311_500],
    [1900, 66_500],
    [0, 0],
  ])('converts %i USD cents to %i satang', (usdCents, satang) => {
    expect(convertFromUsdCents(usdCents, 'THB')).toBe(satang);
  });

  it('rounds THB to whole baht with halves away from zero', () => {
    expect(convertFromUsdCents(1, 'THB')).toBe(0); // 0.35 baht
    expect(convertFromUsdCents(2, 'THB')).toBe(100); // 0.70 baht
    expect(convertFromUsdCents(10, 'THB')).toBe(400); // 3.50 baht rounds up
    expect(convertFromUsdCents(30, 'THB')).toBe(1100); // 10.50 baht rounds up
    expect(convertFromUsdCents(143, 'THB')).toBe(5000); // 50.05 baht
  });

  it('always yields whole baht (a multiple of 100 satang)', () => {
    for (let usdCents = 0; usdCents <= 500; usdCents += 7) {
      expect(convertFromUsdCents(usdCents, 'THB') % 100).toBe(0);
    }
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects %s cents with a RangeError',
    (usdCents) => {
      expect(() => convertFromUsdCents(usdCents, 'USD')).toThrow(RangeError);
      expect(() => convertFromUsdCents(usdCents, 'THB')).toThrow(RangeError);
    },
  );
});

describe('whole-unit helpers (FR-021 price filter)', () => {
  it('converts whole dollars to whole baht exactly', () => {
    expect(convertWholeUnits(49, 'USD', 'THB', 'down')).toBe(1715);
    expect(convertWholeUnits(49, 'USD', 'THB', 'up')).toBe(1715);
  });

  it('rounds a baht bound down for a minimum and up for a maximum when converting to USD', () => {
    expect(convertWholeUnits(1715, 'THB', 'USD', 'down')).toBe(49);
    expect(convertWholeUnits(1715, 'THB', 'USD', 'up')).toBe(49);
    expect(convertWholeUnits(1716, 'THB', 'USD', 'down')).toBe(49);
    expect(convertWholeUnits(1716, 'THB', 'USD', 'up')).toBe(50);
    expect(convertWholeUnits(17, 'THB', 'USD', 'down')).toBe(0);
    expect(convertWholeUnits(17, 'THB', 'USD', 'up')).toBe(1);
  });

  it('returns the same figure when the currency does not change', () => {
    expect(convertWholeUnits(120, 'THB', 'THB', 'up')).toBe(120);
    expect(convertWholeUnits(25, 'USD', 'USD', 'down')).toBe(25);
  });

  it('rejects negative or fractional whole units', () => {
    expect(() => convertWholeUnits(-1, 'USD', 'THB', 'down')).toThrow(RangeError);
    expect(() => convertWholeUnits(1.5, 'USD', 'THB', 'down')).toThrow(RangeError);
    expect(() => wholeUnitsToMinor(-3)).toThrow(RangeError);
  });

  it('turns whole units into minor units', () => {
    expect(wholeUnitsToMinor(25)).toBe(2500);
    expect(wholeUnitsToMinor(0)).toBe(0);
  });

  it('rejects whole units whose minor amount would not be a safe integer', () => {
    expect(() => wholeUnitsToMinor(Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });

  it('floors and ceils minor units to whole units', () => {
    expect(floorToWholeUnits(1999)).toBe(19);
    expect(floorToWholeUnits(2000)).toBe(20);
    expect(ceilToWholeUnits(1901)).toBe(20);
    expect(ceilToWholeUnits(1900)).toBe(19);
    expect(ceilToWholeUnits(0)).toBe(0);
  });
});

describe('percentOf (SPEC 6: single rounding rule)', () => {
  it('computes whole-cent percentages for USD', () => {
    expect(percentOf(14_500, 10)).toBe(1450);
    expect(percentOf(4900, 0)).toBe(0);
    expect(percentOf(4900, 100)).toBe(4900);
  });

  it('rounds USD halves away from zero', () => {
    expect(percentOf(4905, 10)).toBe(491); // 490.5
    expect(percentOf(4895, 10)).toBe(490); // 489.5 rounds up
    expect(percentOf(4904, 10)).toBe(490); // 490.4
  });

  it('rounds THB discounts to whole baht so lines, discount and total add up', () => {
    // 10% of 3,745 baht is 374.5 baht -> 375 baht.
    expect(percentOf(374_500, 10, 'THB')).toBe(37_500);
    // Exact case stays exact.
    expect(percentOf(100_000, 10, 'THB')).toBe(10_000);
    expect(percentOf(374_500, 10, 'THB') % 100).toBe(0);
  });

  it.each([
    ['a negative amount', -1, 10],
    ['a fractional amount', 1.5, 10],
    ['a fractional percentage', 100, 2.5],
    ['a negative percentage', 100, -1],
    ['a percentage above 100', 100, 101],
  ])('rejects %s with a RangeError', (_label, amount, pct) => {
    expect(() => percentOf(amount, pct)).toThrow(RangeError);
  });
});

describe('formatMoney (FR-072)', () => {
  it('formats USD with two decimals in English and Thai', () => {
    expect(formatMoney(4900, 'USD', 'en')).toBe('$49.00');
    expect(formatMoney(4900, 'USD', 'th')).toBe('US$49.00');
    expect(formatMoney(1999, 'USD', 'en')).toBe('$19.99');
  });

  it('formats THB as whole baht with the baht sign in both locales', () => {
    expect(formatMoney(171_500, 'THB', 'en')).toBe('฿1,715');
    expect(formatMoney(171_500, 'THB', 'th')).toBe('฿1,715');
    expect(formatMoney(0, 'THB', 'th')).toBe('฿0');
  });

  it('formats negative amounts for discount lines', () => {
    expect(formatMoney(-500, 'USD', 'en')).toBe('-$5.00');
    expect(formatMoney(-37_500, 'THB', 'en')).toBe('-฿375');
  });

  it('never shows a minus sign for zero, including negative zero', () => {
    expect(formatMoney(-0, 'USD', 'en')).toBe('$0.00');
    expect(formatMoney(-0, 'THB', 'en')).toBe('฿0');
    expect(formatMoney(-0, 'USD', 'th')).toBe('US$0.00');
    expect(formatMoney(0, 'USD', 'en')).toBe('$0.00');
  });

  it('formats the largest safe amount exactly, with no float rounding', () => {
    expect(formatMoney(Number.MAX_SAFE_INTEGER, 'USD', 'en')).toBe('$90,071,992,547,409.91');
    expect(formatMoney(-Number.MAX_SAFE_INTEGER, 'USD', 'en')).toBe('-$90,071,992,547,409.91');
    expect(formatMoney(1, 'USD', 'en')).toBe('$0.01');
    expect(formatMoney(105, 'USD', 'en')).toBe('$1.05');
  });

  it('rejects THB amounts that are not whole baht', () => {
    expect(() => formatMoney(171_550, 'THB', 'en')).toThrow(RangeError);
  });

  it('rejects non-integer amounts', () => {
    expect(() => formatMoney(49.5, 'USD', 'en')).toThrow(RangeError);
    expect(() => formatMoney(Number.NaN, 'USD', 'en')).toThrow(RangeError);
  });

  it('formats repeatedly with the same result (formatter reuse)', () => {
    expect(formatMoney(100, 'USD', 'en')).toBe(formatMoney(100, 'USD', 'en'));
  });
});

describe('currencySymbol (price legend, FR-072)', () => {
  it.each([
    ['USD', 'en', '$'],
    ['USD', 'th', 'US$'],
    ['THB', 'en', '฿'],
    ['THB', 'th', '฿'],
  ] as const)(
    'writes %s in %s as %s, the sign formatMoney itself uses',
    (currency, locale, sign) => {
      expect(currencySymbol(currency, locale)).toBe(sign);
      expect(formatMoney(100, currency, locale)).toContain(sign);
    },
  );
});
