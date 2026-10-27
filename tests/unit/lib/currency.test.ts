import { describe, expect, it } from 'vitest';
import {
  CURRENCIES,
  CURRENCY_COOKIE,
  CURRENCY_SEGMENTS,
  currencyToSegment,
  defaultCurrencyFor,
  parseCurrency,
  resolveCurrency,
  segmentToCurrency,
} from '@/lib/currency';

describe('currency cookie and resolution (SPEC 6, FR-002, owner decision 8)', () => {
  it('uses the hc_currency cookie with USD and THB as the only currencies', () => {
    expect(CURRENCY_COOKIE).toBe('hc_currency');
    expect(CURRENCIES).toEqual(['USD', 'THB']);
    expect(CURRENCY_SEGMENTS).toEqual(['usd', 'thb']);
  });

  it.each(['USD', 'THB'])('parses the valid cookie value %s', (value) => {
    expect(parseCurrency(value)).toBe(value);
  });

  it.each([['usd'], ['EUR'], [''], [null], [undefined], [42], [{}], [['USD']]])(
    'rejects the invalid cookie value %j',
    (value) => {
      expect(parseCurrency(value)).toBeNull();
    },
  );

  it('defaults to USD for English and THB for Thai', () => {
    expect(defaultCurrencyFor('en')).toBe('USD');
    expect(defaultCurrencyFor('th')).toBe('THB');
  });

  it('maps currencies to the hidden route segment and back', () => {
    expect(currencyToSegment('USD')).toBe('usd');
    expect(currencyToSegment('THB')).toBe('thb');
    expect(segmentToCurrency('usd')).toBe('USD');
    expect(segmentToCurrency('thb')).toBe('THB');
    for (const currency of CURRENCIES) {
      expect(segmentToCurrency(currencyToSegment(currency))).toBe(currency);
    }
  });

  it.each([['USD'], ['eur'], [''], [undefined], [7]])(
    'rejects the invalid route segment %j',
    (segment) => {
      expect(segmentToCurrency(segment)).toBeNull();
    },
  );

  it('prefers a valid cookie over the locale default', () => {
    expect(resolveCurrency('THB', 'en')).toBe('THB');
    expect(resolveCurrency('USD', 'th')).toBe('USD');
  });

  it('falls back to the locale default when the cookie is missing or invalid', () => {
    expect(resolveCurrency(undefined, 'en')).toBe('USD');
    expect(resolveCurrency(undefined, 'th')).toBe('THB');
    expect(resolveCurrency('garbage', 'th')).toBe('THB');
  });
});
