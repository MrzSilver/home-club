import { createRequire } from 'node:module';

import { afterEach, describe, expect, it } from 'vitest';

type Assertion = [string, Record<string, number>] | 'off';
type Config = {
  ci: {
    collect: { startServerCommand?: string; url: string[]; numberOfRuns: number };
    assert: { aggregationMethod: string; assertions: Record<string, Assertion> };
  };
};

const require = createRequire(import.meta.url);
const CONFIG_PATH = require.resolve('../../lighthouserc.cjs');

function load(baseUrl: string | undefined, target?: string): Config {
  delete require.cache[CONFIG_PATH];
  if (baseUrl === undefined) delete process.env['LHCI_BASE_URL'];
  else process.env['LHCI_BASE_URL'] = baseUrl;
  if (target === undefined) delete process.env['LHCI_TARGET'];
  else process.env['LHCI_TARGET'] = target;
  return require(CONFIG_PATH) as Config;
}

// Home and one Collection page per locale (T08).
const ROUTES = [
  '/en',
  '/th',
  '/en/shop',
  '/th/collections/foundations',
  '/en/products/essential-tee',
  '/th/products/essential-tee',
  '/en/looks/the-essential-look',
  '/th/looks/the-essential-look',
];

const MACHINE_DEPENDENT = [
  'categories:performance',
  'largest-contentful-paint',
  'total-blocking-time',
];
const DETERMINISTIC = [
  'categories:accessibility',
  'categories:best-practices',
  'categories:seo',
  'cumulative-layout-shift',
];

describe('lighthouserc.cjs (ADR-0004 amendment)', () => {
  const original = process.env['LHCI_BASE_URL'];
  const originalTarget = process.env['LHCI_TARGET'];
  afterEach(() => {
    delete require.cache[CONFIG_PATH];
    if (original === undefined) delete process.env['LHCI_BASE_URL'];
    else process.env['LHCI_BASE_URL'] = original;
    if (originalTarget === undefined) delete process.env['LHCI_TARGET'];
    else process.env['LHCI_TARGET'] = originalTarget;
  });

  it('without LHCI_BASE_URL serves the build locally and only warns on machine-dependent metrics', () => {
    const { ci } = load(undefined);
    expect(ci.collect.startServerCommand).toBe('pnpm start');
    expect(ci.collect.url).toEqual(ROUTES.map((route) => `http://localhost:3000${route}`));
    for (const key of MACHINE_DEPENDENT) expect(ci.assert.assertions[key]?.[0]).toBe('warn');
    for (const key of DETERMINISTIC) expect(ci.assert.assertions[key]?.[0]).toBe('error');
  });

  it('with LHCI_BASE_URL audits that deployment, starts no server and errors on every assertion', () => {
    const { ci } = load('https://home-club-git-x.vercel.app/');
    expect(ci.collect.startServerCommand).toBeUndefined();
    expect(ci.collect.url).toEqual(
      ROUTES.map((route) => `https://home-club-git-x.vercel.app${route}`),
    );
    for (const [, [level]] of Object.entries(ci.assert.assertions)) expect(level).toBe('error');
  });

  it('keeps the budgets and the median aggregation in both modes', () => {
    for (const base of [undefined, 'https://example.vercel.app']) {
      const { ci } = load(base);
      expect(ci.assert.aggregationMethod).toBe('median');
      expect(ci.assert.assertions['largest-contentful-paint']?.[1]).toEqual({
        maxNumericValue: 2500,
      });
      expect(ci.assert.assertions['total-blocking-time']?.[1]).toEqual({ maxNumericValue: 200 });
      expect(ci.assert.assertions['categories:performance']?.[1]).toEqual({ minScore: 0.95 });
    }
  });
  it('exempts only intentional Preview indexing while retaining the other SEO release checks', () => {
    const { ci } = load('https://example.vercel.app', 'preview');
    expect(ci.collect.numberOfRuns).toBe(5);
    expect(ci.assert.assertions['categories:seo']?.[0]).toBe('warn');
    expect(ci.assert.assertions['is-crawlable']).toBe('off');
    for (const id of [
      'document-title',
      'meta-description',
      'http-status-code',
      'link-text',
      'crawlable-anchors',
      'image-alt',
      'hreflang',
      'canonical',
    ])
      expect(ci.assert.assertions[id]).toEqual(['error', { minScore: 1 }]);
    for (const id of MACHINE_DEPENDENT) expect(ci.assert.assertions[id]?.[0]).toBe('error');
    expect(ci.assert.assertions['categories:best-practices']).toEqual([
      'error',
      { minScore: 0.95 },
    ]);
    expect(
      load('https://example.vercel.app', 'production').ci.assert.assertions['categories:seo'],
    ).toEqual(['error', { minScore: 0.95 }]);
  });
});
