import { z } from 'zod';

import p1Raw from '@docs/p1-deployed-audit.json';
import p2Raw from '@docs/p2-deployed-audit.json';
import p3Raw from '@docs/p3-deployed-audit.json';

const REPO_URL = 'https://github.com/MrzSilver/home-club';

/** External destinations of the case study (FR-062). URLs are data, not translated copy. */
export const CASE_STUDY_LINKS = {
  source: REPO_URL,
  live: 'https://home-club-eight.vercel.app',
  assets: `${REPO_URL}/blob/main/docs/ASSETS.md`,
} as const;

/** Tool names are proper nouns; the "why" sentence for each is in `caseStudy.stack.items.<id>`. */
export const STACK_ITEMS = [
  { id: 'next', name: 'Next.js' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'tailwind', name: 'Tailwind CSS' },
  { id: 'intl', name: 'next-intl' },
  { id: 'zustand', name: 'Zustand and Zod' },
  { id: 'radix', name: 'Radix' },
  { id: 'vitest', name: 'Vitest' },
  { id: 'playwright', name: 'Playwright and axe' },
  { id: 'lighthouse', name: 'Lighthouse CI' },
] as const;

export type StackItemId = (typeof STACK_ITEMS)[number]['id'];

const routeSchema = z.object({
  route: z.string().min(1),
  runs: z.number().int().positive(),
  performance: z.number().min(0).max(1),
  accessibility: z.number().min(0).max(1),
  bestPractices: z.number().min(0).max(1),
  seo: z.number().min(0).max(1),
  lcpMs: z.number().nonnegative(),
  tbtMs: z.number().nonnegative(),
  cls: z.number().nonnegative(),
});

const METRICS = {
  'largest-contentful-paint': { metric: 'lcp', key: 'lcpMs' },
  'total-blocking-time': { metric: 'tbt', key: 'tbtMs' },
  'cumulative-layout-shift': { metric: 'cls', key: 'cls' },
} as const;

// An unknown assertion id fails the build instead of silently hiding a missed budget.
const failedAssertionSchema = z.object({
  route: z.string().min(1),
  id: z.enum(['largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift']),
  maxNumericValue: z.number().nonnegative(),
  actualNumericValue: z.number().nonnegative(),
});

const auditSchema = z.object({
  gate: z.string().min(1),
  failedAssertions: z.array(failedAssertionSchema),
  auditDate: z.iso.date(),
  runsPerUrl: z.number().int().positive(),
  target: z.string().optional(),
  routes: z.array(routeSchema).min(1),
});

export type AuditRoute = z.infer<typeof routeSchema>;

export type AuditMetric = 'lcp' | 'tbt' | 'cls';

/** A budget a run missed, with the first later run that met it on the same route (if any). */
export type AuditFailure = {
  route: string;
  metric: AuditMetric;
  actual: number;
  limit: number;
  fixed?: { id: AuditReport['id']; actual: number } | undefined;
};

export type AuditReport = {
  id: 'p3' | 'p2' | 'p1';
  /** File under `docs/`, shown as the source and linked on GitHub. */
  file: string;
  url: string;
  auditDate: string;
  runsPerUrl: number;
  /** Preview deployments are noindex on purpose, so their SEO score is not the site's. */
  isPreview: boolean;
  routes: AuditRoute[];
  gatePassed: boolean;
  failures: AuditFailure[];
};

type Parsed = z.infer<typeof auditSchema>;

function load(id: AuditReport['id'], parsed: Parsed): AuditReport {
  const file = `docs/${id}-deployed-audit.json`;
  return {
    id,
    file,
    url: `${REPO_URL}/blob/main/${file}`,
    auditDate: parsed.auditDate,
    runsPerUrl: parsed.runsPerUrl,
    isPreview: parsed.target?.includes('Preview') ?? false,
    routes: parsed.routes,
    gatePassed: parsed.gate === 'passed',
    failures: [],
  };
}

function failuresOf(parsed: Parsed, later: AuditReport[]): AuditFailure[] {
  return parsed.failedAssertions.map((failed) => {
    const { metric, key } = METRICS[failed.id];
    const fixedBy = later.find(
      (report) =>
        report.routes.some((r) => r.route === failed.route) &&
        !report.failures.some((x) => x.route === failed.route && x.metric === metric),
    );
    const row = fixedBy?.routes.find((r) => r.route === failed.route);
    return {
      route: failed.route,
      metric,
      actual: failed.actualNumericValue,
      limit: failed.maxNumericValue,
      fixed: fixedBy && row ? { id: fixedBy.id, actual: row[key] } : undefined,
    };
  });
}

/** The gated P3 Preview run first, then the earlier phases. Parsed at build; a bad file fails the build. */
export function loadAuditReports(): { latest: AuditReport; earlier: AuditReport[] } {
  const p1 = auditSchema.parse(p1Raw);
  const p2 = auditSchema.parse(p2Raw);
  const p3 = auditSchema.parse(p3Raw);
  const r3 = load('p3', p3);
  const r2 = load('p2', p2);
  const r1 = load('p1', p1);
  r3.failures = failuresOf(p3, []);
  r2.failures = failuresOf(p2, [r3]);
  r1.failures = failuresOf(p1, [r2, r3]);
  return { latest: r3, earlier: [r2, r1] };
}
