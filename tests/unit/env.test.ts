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

describe('env', () => {
  it('exposes the validated environment of the current process', () => {
    expect(env.NEXT_PUBLIC_SITE_URL).toMatch(/^https?:\/\//);
  });
});
