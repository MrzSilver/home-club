import { describe, expect, it } from 'vitest';

import { env, parseEnv } from '@/lib/env';

describe('parseEnv', () => {
  it('defaults NEXT_PUBLIC_SITE_URL to localhost when unset', () => {
    expect(parseEnv({}).NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000');
  });

  it('treats an empty NEXT_PUBLIC_SITE_URL like an unset one', () => {
    expect(parseEnv({ NEXT_PUBLIC_SITE_URL: '' }).NEXT_PUBLIC_SITE_URL).toBe(
      'http://localhost:3000',
    );
  });

  it('accepts a valid https URL', () => {
    expect(
      parseEnv({ NEXT_PUBLIC_SITE_URL: 'https://homeclub.example' }).NEXT_PUBLIC_SITE_URL,
    ).toBe('https://homeclub.example');
  });

  it('fails fast on a value that is not a URL, naming the key', () => {
    expect(() => parseEnv({ NEXT_PUBLIC_SITE_URL: 'not a url' })).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it('rejects non-http(s) URL schemes', () => {
    expect(() => parseEnv({ NEXT_PUBLIC_SITE_URL: 'javascript:alert(1)' })).toThrow(
      /NEXT_PUBLIC_SITE_URL/,
    );
  });
});

describe('parseEnv production guard (SEO NFR)', () => {
  const production = { VERCEL_ENV: 'production' } as const;

  it('throws in production when NEXT_PUBLIC_SITE_URL is unset', () => {
    expect(() => parseEnv({ ...production })).toThrow(/NEXT_PUBLIC_SITE_URL.*https/);
  });

  it('throws in production when NEXT_PUBLIC_SITE_URL is empty', () => {
    expect(() => parseEnv({ ...production, NEXT_PUBLIC_SITE_URL: '' })).toThrow(
      /NEXT_PUBLIC_SITE_URL/,
    );
  });

  it.each([
    'http://localhost:3000',
    'https://localhost',
    'https://127.0.0.1',
    'https://[::1]',
    'https://shop.localhost',
    'http://example.com',
  ])('throws in production for %s', (url) => {
    expect(() => parseEnv({ ...production, NEXT_PUBLIC_SITE_URL: url })).toThrow(
      /NEXT_PUBLIC_SITE_URL/,
    );
  });

  it('accepts a public https origin in production', () => {
    expect(
      parseEnv({ ...production, NEXT_PUBLIC_SITE_URL: 'https://homeclub.example' })
        .NEXT_PUBLIC_SITE_URL,
    ).toBe('https://homeclub.example');
  });

  it('keeps the localhost default in preview', () => {
    expect(parseEnv({ VERCEL_ENV: 'preview' }).NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000');
  });

  it('keeps the localhost default when VERCEL_ENV is absent', () => {
    expect(parseEnv({}).NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000');
  });

  it('treats an unknown VERCEL_ENV value as non-production', () => {
    expect(parseEnv({ VERCEL_ENV: 'staging' }).NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000');
  });
});

describe('env', () => {
  it('exposes the validated environment of the current process', () => {
    expect(env.NEXT_PUBLIC_SITE_URL).toMatch(/^https?:\/\//);
  });
});
