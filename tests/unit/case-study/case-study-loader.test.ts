import type * as CaseStudy from '@/content/case-study';
import { afterEach, describe, expect, it, vi } from 'vitest';

import p1 from '@docs/p1-deployed-audit.json';
import p2 from '@docs/p2-deployed-audit.json';
import p3 from '@docs/p3-deployed-audit.json';

// A loose view of an audit file, so a test can break one on purpose.
type Audit = {
  gate?: string;
  failedAssertions: unknown[];
  auditDate: string;
  routes: { route: string; performance: number }[];
};
type Loader = typeof CaseStudy;

/** Loads the module fresh with the given audit files standing in for the three stored reports. */
async function loadWith(files: { p1?: unknown; p2?: unknown; p3?: unknown }): Promise<Loader> {
  vi.resetModules();
  vi.doMock('@docs/p1-deployed-audit.json', () => ({ default: files.p1 ?? p1 }));
  vi.doMock('@docs/p2-deployed-audit.json', () => ({ default: files.p2 ?? p2 }));
  vi.doMock('@docs/p3-deployed-audit.json', () => ({ default: files.p3 ?? p3 }));
  return import('@/content/case-study');
}

const clone = (audit: object): Audit => structuredClone(audit) as Audit;

afterEach(() => {
  vi.doUnmock('@docs/p1-deployed-audit.json');
  vi.doUnmock('@docs/p2-deployed-audit.json');
  vi.doUnmock('@docs/p3-deployed-audit.json');
  vi.resetModules();
});

describe('case-study audit loader (FR-062)', () => {
  it('parses the three stored reports with the gated P3 run as the latest (FR-062)', async () => {
    const { loadAuditReports } = await import('@/content/case-study');
    const { latest, earlier } = loadAuditReports();
    expect(latest.id).toBe('p3');
    expect(earlier.map((report) => report.id)).toEqual(['p2', 'p1']);
    expect(latest.file).toBe('docs/p3-deployed-audit.json');
    expect(latest.url).toBe(
      'https://github.com/MrzSilver/home-club/blob/main/docs/p3-deployed-audit.json',
    );
    expect(latest.routes.length).toBeGreaterThan(0);
  });

  it('marks Preview deployments and reports the gate result from the file (FR-062)', async () => {
    const { loadAuditReports } = await import('@/content/case-study');
    const { latest, earlier } = loadAuditReports();
    expect(latest.isPreview).toBe(true);
    expect(latest.gatePassed).toBe(true);
    expect(latest.failures).toEqual([]);
    const p1Report = earlier.find((report) => report.id === 'p1');
    expect(p1Report?.isPreview).toBe(false);
    expect(p1Report?.gatePassed).toBe(false);
  });

  it('keeps the P1 LCP miss and names the phase that fixed it (FR-062)', async () => {
    const { loadAuditReports } = await import('@/content/case-study');
    const p1Report = loadAuditReports().earlier.find((report) => report.id === 'p1');
    expect(p1Report?.failures).toHaveLength(1);
    const failure = p1Report?.failures[0];
    expect(failure).toMatchObject({
      route: '/th/collections/foundations',
      metric: 'lcp',
      actual: 2513.533,
      limit: 2500,
    });
    expect(failure?.fixed?.id).toBe('p2');
    const p2Row = p2.routes.find((row) => row.route === '/th/collections/foundations');
    expect(failure?.fixed?.actual).toBe(p2Row?.lcpMs);
    expect(failure?.fixed?.actual).toBeLessThanOrEqual(2500);
  });

  it('leaves a miss unfixed when no later run covers the route (FR-062)', async () => {
    const noRoute = clone(p2);
    noRoute.routes = noRoute.routes.filter((row) => row.route !== '/th/collections/foundations');
    const later = clone(p3);
    later.routes = later.routes.filter((row) => row.route !== '/th/collections/foundations');
    const { loadAuditReports } = await loadWith({ p2: noRoute, p3: later });
    const failure = loadAuditReports().earlier.find((r) => r.id === 'p1')?.failures[0];
    expect(failure?.fixed).toBeUndefined();
  });

  it('does not count a later run that missed the same budget as the fix (FR-062)', async () => {
    const failing = clone(p2);
    failing.gate = 'failed';
    failing.failedAssertions = [
      {
        route: '/th/collections/foundations',
        id: 'largest-contentful-paint',
        maxNumericValue: 2500,
        actualNumericValue: 2600,
      },
    ];
    const { loadAuditReports } = await loadWith({ p2: failing });
    const { earlier } = loadAuditReports();
    const p1Failure = earlier.find((r) => r.id === 'p1')?.failures[0];
    expect(p1Failure?.fixed?.id).toBe('p3');
    expect(earlier.find((r) => r.id === 'p2')?.failures[0]?.fixed?.id).toBe('p3');
  });

  it('rejects a file with an assertion id it does not know, so a miss cannot be hidden (FR-062)', async () => {
    const bad = clone(p3);
    bad.gate = 'failed';
    bad.failedAssertions = [
      { route: '/en', id: 'speed-index', maxNumericValue: 1, actualNumericValue: 2 },
    ];
    const { loadAuditReports } = await loadWith({ p3: bad });
    expect(() => loadAuditReports()).toThrow();
  });

  it('rejects a file without a gate result (FR-062)', async () => {
    const bad = clone(p3);
    delete bad.gate;
    const { loadAuditReports } = await loadWith({ p3: bad });
    expect(() => loadAuditReports()).toThrow();
  });

  it('rejects a file with no routes (FR-062)', async () => {
    const bad = clone(p3);
    bad.routes = [];
    const { loadAuditReports } = await loadWith({ p3: bad });
    expect(() => loadAuditReports()).toThrow();
  });

  it('rejects a score outside 0 to 1 and a malformed date (FR-062)', async () => {
    const badScore = clone(p3);
    const [first] = badScore.routes;
    if (first) first.performance = 95;
    const scoreLoader = await loadWith({ p3: badScore });
    expect(() => scoreLoader.loadAuditReports()).toThrow();

    const badDate = clone(p3);
    badDate.auditDate = '31/10/2026';
    const dateLoader = await loadWith({ p3: badDate });
    expect(() => dateLoader.loadAuditReports()).toThrow();
  });

  it('exposes external links as https URLs and one stack entry per tool (FR-062)', async () => {
    const { CASE_STUDY_LINKS, STACK_ITEMS } = await import('@/content/case-study');
    for (const url of Object.values(CASE_STUDY_LINKS))
      expect(url.startsWith('https://')).toBe(true);
    const ids = STACK_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
