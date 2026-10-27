import { describe, expect, it, vi } from 'vitest';

import en from '@messages/en.json';
import th from '@messages/th.json';
import getConfig from '@/i18n/request';
import { routing } from '@/i18n/routing';

// Outside a Next.js server build, next-intl/server resolves to a stub that throws. In the real
// package getRequestConfig() returns the function it is given, which is all this stand-in does.
vi.mock('next-intl/server', () => ({
  getRequestConfig: <T>(config: T): T => config,
}));

type RequestConfigInput = Parameters<typeof getConfig>[0];
const input = (requested: string | undefined): RequestConfigInput =>
  ({ requestLocale: Promise.resolve(requested) }) as RequestConfigInput;

describe('i18n request config (FR-070, FR-071)', () => {
  it('declares the locales, the default and the always-visible prefix', () => {
    expect(routing.locales).toEqual(['en', 'th']);
    expect(routing.defaultLocale).toBe('en');
    expect(routing.localePrefix).toBe('always');
  });

  it('loads the English catalogue for en', async () => {
    const config = await getConfig(input('en'));
    expect(config.locale).toBe('en');
    expect(config.messages).toEqual(en);
  });

  it('loads the Thai catalogue for th', async () => {
    const config = await getConfig(input('th'));
    expect(config.locale).toBe('th');
    expect(config.messages).toEqual(th);
  });

  it.each([undefined, 'fr', 'EN', ''])('falls back to the default locale for %j', async (raw) => {
    const config = await getConfig(input(raw));
    expect(config.locale).toBe('en');
    expect(config.messages).toEqual(en);
  });
});
