import { describe, expect, it } from 'vitest';

import { currencyFromParam, localeFromParam, resolveRouteParams } from '@/i18n/params';

// notFound() throws an error whose digest marks it as a 404; that is how Next.js recognises it.
const NOT_FOUND = expect.objectContaining({ digest: expect.stringContaining('404') });

describe('route param validation (RULES 2.3, FR-071)', () => {
  it('accepts the supported locales', () => {
    expect(localeFromParam('en')).toBe('en');
    expect(localeFromParam('th')).toBe('th');
  });

  it.each(['fr', 'EN', '', 'en-US', 'images'])('answers 404 for the locale %j', (raw) => {
    expect(() => localeFromParam(raw)).toThrow(NOT_FOUND);
  });

  it('maps the hidden currency segment to a currency', () => {
    expect(currencyFromParam('usd')).toBe('USD');
    expect(currencyFromParam('thb')).toBe('THB');
  });

  it.each(['USD', 'eur', '', 'shop'])('answers 404 for the currency segment %j', (raw) => {
    expect(() => currencyFromParam(raw)).toThrow(NOT_FOUND);
  });

  it('resolves both params of a page', async () => {
    await expect(
      resolveRouteParams(Promise.resolve({ locale: 'th', currency: 'thb' })),
    ).resolves.toEqual({ locale: 'th', currency: 'THB' });
  });

  it('rejects a page request when either param is invalid', async () => {
    await expect(
      resolveRouteParams(Promise.resolve({ locale: 'fr', currency: 'usd' })),
    ).rejects.toEqual(NOT_FOUND);
    await expect(
      resolveRouteParams(Promise.resolve({ locale: 'en', currency: 'eur' })),
    ).rejects.toEqual(NOT_FOUND);
  });
});
