import { describe, expect, it } from 'vitest';

import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { LOCALES } from '@/data/locales';

describe('robots (FR-071)', () => {
  it('disallows cart, checkout and search in every locale, with public paths only', () => {
    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;
    const disallow = ([] as string[]).concat(rule?.disallow ?? []);
    for (const locale of LOCALES) {
      for (const route of ['cart', 'checkout', 'search']) {
        expect(disallow).toContain(`/${locale}/${route}`);
      }
    }
    expect(disallow.some((path) => /\/(usd|thb)\//.test(path))).toBe(false);
    expect(rule?.allow).toBe('/');
  });

  it('points at an absolute sitemap URL', () => {
    expect(robots().sitemap).toMatch(/^https?:\/\/.+\/sitemap\.xml$/);
  });
});

describe('sitemap (FR-071)', () => {
  it('lists the case study in both locales with alternates and no currency segment', () => {
    const entries = sitemap();
    expect(entries.length).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      expect(entries.some((entry) => entry.url.endsWith(`/${locale}/case-study`))).toBe(true);
    }
    for (const entry of entries) expect(entry.url).not.toMatch(/\/(usd|thb)(\/|$)/);
  });

  it('keeps cart, checkout and search out of the sitemap', () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.some((url) => /\/(cart|checkout|search)(\/|$)/.test(url))).toBe(false);
  });
});
