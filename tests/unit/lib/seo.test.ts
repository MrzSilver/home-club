import { describe, expect, it } from 'vitest';

import { openGraphLocales } from '@/lib/seo';

describe('openGraphLocales (FR-071)', () => {
  it('writes English as en_US and lists Thai as the alternate', () => {
    expect(openGraphLocales('en')).toEqual({ locale: 'en_US', alternateLocale: ['th_TH'] });
  });

  it('writes Thai as th_TH and lists English as the alternate', () => {
    expect(openGraphLocales('th')).toEqual({ locale: 'th_TH', alternateLocale: ['en_US'] });
  });
});
