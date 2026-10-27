import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { regexes } from 'zod/v4/core';

import { EMAIL_PATTERN, parseNewsletterEmail } from '@/lib/newsletter';

describe('parseNewsletterEmail (FR-003)', () => {
  it('accepts a plain address and trims surrounding whitespace', () => {
    expect(parseNewsletterEmail('  peem@example.com ')).toEqual({
      ok: true,
      email: 'peem@example.com',
    });
  });

  it.each(['', '   ', '\t\n'])('reports %j as required', (value) => {
    expect(parseNewsletterEmail(value)).toEqual({ ok: false, reason: 'required' });
  });

  it.each([
    'peem',
    'peem@',
    '@example.com',
    'peem@example',
    'peem@@example.com',
    'a b@example.com',
  ])('reports %j as invalid', (value) => {
    expect(parseNewsletterEmail(value)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('uses exactly the pattern behind Zod 4 z.email(), so an upgrade that changes it fails here', () => {
    expect(EMAIL_PATTERN.source).toBe(regexes.email.source);
  });

  it('agrees with Zod 4 z.email() on a corpus, so the browser-safe copy cannot drift', () => {
    const schema = z.email();
    const corpus = [
      'a@b.co',
      'first.last@example.com',
      "o'brien@example.co.th",
      'plus+tag@sub.example.org',
      'under_score@example.io',
      'dash-ed@ex-ample.com',
      '.leading@example.com',
      'trailing.@example.com',
      'double..dot@example.com',
      'no-tld@example',
      'short-tld@example.c',
      'digit-tld@example.c0m',
      'space in@example.com',
      'ไทย@example.com',
      'a@-example.com',
      'a@exa_mple.com',
      'a@example..com',
      '',
    ];
    for (const value of corpus) {
      expect(parseNewsletterEmail(value).ok, value).toBe(schema.safeParse(value).success);
    }
  });
});
