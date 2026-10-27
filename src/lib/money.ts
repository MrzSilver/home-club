import type { Locale } from '@/data/schema';

export type Currency = 'USD' | 'THB';

// Fixed demo value, not live data (SPEC 6, owner decision 4). 1 USD = 35 THB.
export const FX_USD_THB = 35;

// Minor units are uniform across currencies: the amount is always (major units x 100). For THB the
// amount is whole baht expressed in satang (baht x 100), so a THB figure is always a multiple of 100
// and `formatMoney` shows no decimals (SPEC 6: THB is whole baht).
const MINOR_PER_MAJOR = 100;

// Smallest amount a price in this currency may be split into: one cent for USD, one whole baht for
// THB. Rounding to this step keeps displayed lines, discounts and totals adding up exactly.
const ROUNDING_STEP: Readonly<Record<Currency, number>> = { USD: 1, THB: MINOR_PER_MAJOR };

const INTL_LOCALE: Readonly<Record<Locale, string>> = { en: 'en-US', th: 'th-TH' };

function assertInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a safe integer, received ${value}`);
  }
}

export function assertMinorUnits(value: number, label: string): void {
  assertInteger(value, label);
  if (value < 0) throw new RangeError(`${label} must not be negative, received ${value}`);
}

// Exact integer division floor for non-negative safe integers. `%` is exact, so the quotient is too
// (a plain `Math.floor(a / b)` can be off by one for very large operands).
const floorDiv = (dividend: number, divisor: number): number =>
  (dividend - (dividend % divisor)) / divisor;

/**
 * The single rounding rule for money (RULES 7.2): round(numerator / denominator), halves away from
 * zero, on integers only. No floating-point value ever represents a price in between.
 */
export function roundHalfAwayFromZero(numerator: number, denominator: number): number {
  assertInteger(numerator, 'numerator');
  assertInteger(denominator, 'denominator');
  if (denominator <= 0)
    throw new RangeError(`denominator must be positive, received ${denominator}`);
  const doubled = 2 * Math.abs(numerator) + denominator;
  if (!Number.isSafeInteger(doubled)) {
    throw new RangeError('numerator is too large to round exactly');
  }
  const magnitude = floorDiv(doubled, 2 * denominator);
  return numerator < 0 && magnitude !== 0 ? -magnitude : magnitude;
}

/**
 * Converts catalogue USD cents to integer minor units of `currency`. THB: round(usd x 35) whole
 * baht, expressed in satang. Convert each catalogue unit price once and do all later arithmetic in
 * the display currency, so line totals and the grand total always add up.
 */
export function convertFromUsdCents(usdCents: number, currency: Currency): number {
  assertMinorUnits(usdCents, 'usdCents');
  switch (currency) {
    case 'USD':
      return usdCents;
    case 'THB':
      return roundHalfAwayFromZero(usdCents * FX_USD_THB, MINOR_PER_MAJOR) * MINOR_PER_MAJOR;
    default: {
      const unreachable: never = currency;
      return unreachable;
    }
  }
}

export type WholeUnitRounding = 'down' | 'up';

/**
 * Converts a whole-unit price bound (dollars or baht, as used in URL price filters) between
 * currencies. A lower bound must round `down` and an upper bound `up`, so converting a range never
 * hides a product the range showed. USD to THB is exact (an integer rate), so only THB to USD rounds.
 */
export function convertWholeUnits(
  units: number,
  from: Currency,
  to: Currency,
  rounding: WholeUnitRounding,
): number {
  assertMinorUnits(units, 'units');
  if (from === to) return units;
  if (from === 'USD') {
    const baht = units * FX_USD_THB;
    assertInteger(baht, 'converted units');
    return baht;
  }
  return rounding === 'down'
    ? floorDiv(units, FX_USD_THB)
    : floorDiv(units + FX_USD_THB - 1, FX_USD_THB);
}

/** Whole units (dollars / baht) at or below an amount of minor units, for price-range lower bounds. */
export function floorToWholeUnits(minor: number): number {
  assertMinorUnits(minor, 'minor');
  return floorDiv(minor, MINOR_PER_MAJOR);
}

/** Whole units (dollars / baht) at or above an amount of minor units, for price-range upper bounds. */
export function ceilToWholeUnits(minor: number): number {
  assertMinorUnits(minor, 'minor');
  return floorDiv(minor + MINOR_PER_MAJOR - 1, MINOR_PER_MAJOR);
}

/** Minor units for a whole-unit amount: 25 dollars -> 2500 cents, 900 baht -> 90000 satang. */
export function wholeUnitsToMinor(units: number): number {
  assertMinorUnits(units, 'units');
  const minor = units * MINOR_PER_MAJOR;
  assertInteger(minor, 'amount');
  return minor;
}

/**
 * pct percent of an amount, rounded with the single rounding rule to the currency's smallest step
 * (cents for USD, whole baht for THB). Used for the look discount, applied once on the set subtotal.
 */
export function percentOf(amountMinor: number, pct: number, currency: Currency = 'USD'): number {
  assertMinorUnits(amountMinor, 'amount');
  assertInteger(pct, 'pct');
  if (pct < 0 || pct > 100) throw new RangeError(`pct must be between 0 and 100, received ${pct}`);
  const step = ROUNDING_STEP[currency];
  // amount x pct / 100 expressed in steps, then back to minor units.
  return roundHalfAwayFromZero(amountMinor * pct, 100 * step) * step;
}

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: Currency, locale: Locale): Intl.NumberFormat {
  const key = `${locale}:${currency}`;
  const cached = formatters.get(key);
  if (cached !== undefined) return cached;
  const formatter = new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency,
    // THB shows the baht sign in both locales ("฿1,715"); USD keeps the locale default
    // ("$49.00" in en, "US$49.00" in th, which stays unambiguous next to baht).
    currencyDisplay: currency === 'THB' ? 'narrowSymbol' : 'symbol',
    minimumFractionDigits: currency === 'THB' ? 0 : 2,
    maximumFractionDigits: currency === 'THB' ? 0 : 2,
  });
  formatters.set(key, formatter);
  return formatter;
}

/**
 * The only way prices are displayed (SPEC 6, FR-072). `amountMinor` is integer minor units of
 * `currency` (cents, or satang for THB). Negative amounts are allowed so discount lines can be
 * formatted; zero never shows a minus sign. The value is handed to Intl as an exact decimal string,
 * so no float division is involved and every safe integer formats exactly.
 */
export function formatMoney(amountMinor: number, currency: Currency, locale: Locale): string {
  assertInteger(amountMinor, 'amount');
  if (currency === 'THB' && amountMinor % MINOR_PER_MAJOR !== 0) {
    throw new RangeError(
      `THB amounts must be whole baht (multiples of 100), received ${amountMinor}`,
    );
  }
  const magnitude = Math.abs(amountMinor);
  const major = floorDiv(magnitude, MINOR_PER_MAJOR);
  const minor = String(magnitude % MINOR_PER_MAJOR).padStart(2, '0');
  const sign = amountMinor < 0 ? '-' : '';
  // A decimal string is an exact Intl input; the assertion only widens the template literal type.
  const decimal = `${sign}${major}.${minor}` as `${number}`;
  return formatterFor(currency, locale).format(decimal);
}
