import { createRequire } from 'node:module';

import { afterEach, describe, expect, it } from 'vitest';

type Assertion = [string, Record<string, number>];
type Config = {
  ci: {
    collect: { startServerCommand?: string; url: string[] };
    assert: { aggregationMethod: string; assertions: Record<string, Assertion> };
  };
};

const require = createRequire(import.meta.url);
const CONFIG_PATH = require.resolve('../../lighthouserc.cjs');

function load(baseUrl: string | undefined): Config {
  delete require.cache[CONFIG_PATH];
  if (baseUrl === undefined) delete process.env['LHCI_BASE_URL'];
  else process.env['LHCI_BASE_URL'] = baseUrl;
  return require(CONFIG_PATH) as Config;
}

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
  afterEach(() => {
    delete require.cache[CONFIG_PATH];
    if (original === undefined) delete process.env['LHCI_BASE_URL'];
    else process.env['LHCI_BASE_URL'] = original;
  });

  it('without LHCI_BASE_URL serves the build locally and only warns on machine-dependent metrics', () => {
    const { ci } = load(undefined);
    expect(ci.collect.startServerCommand).toBe('pnpm start');
    expect(ci.collect.url).toEqual(['http://localhost:3000/en', 'http://localhost:3000/th']);
    for (const key of MACHINE_DEPENDENT) expect(ci.assert.assertions[key]?.[0]).toBe('warn');
    for (const key of DETERMINISTIC) expect(ci.assert.assertions[key]?.[0]).toBe('error');
  });

  it('with LHCI_BASE_URL audits that deployment, starts no server and errors on every assertion', () => {
    const { ci } = load('https://home-club-git-x.vercel.app/');
    expect(ci.collect.startServerCommand).toBeUndefined();
    expect(ci.collect.url).toEqual([
      'https://home-club-git-x.vercel.app/en',
      'https://home-club-git-x.vercel.app/th',
    ]);
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
});
