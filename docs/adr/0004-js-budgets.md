# ADR-0004: First-load JavaScript budgets rebased on the framework baseline

- Status: **Accepted** (2026-10-27, owner decision)
- Date: 2026-10-27
- Deciders: owner (Silver), orchestrator
- Supersedes: the "First-load JS (gzip) per route" row of SPEC §12 as originally written

## Context

SPEC §12 set first-load JavaScript budgets of Home ≤ 130 kB, Collection ≤ 130 kB and Product ≤ 150 kB (gzip).
After T03 the Home route still renders only a temporary placeholder, yet it already ships **150.8 kB gzip**
(129.7 kB brotli) of JavaScript, measured on 2026-10-27 by loading `/en` from `pnpm start` in Chromium and
gzipping every script response (level 9):

| Chunk                                                             | gzip    |
| ----------------------------------------------------------------- | ------- |
| React DOM 19.3                                                    | 70.3 kB |
| Next.js 16.4 app router runtime                                   | 45.3 kB |
| Other Next/React runtime chunks (Turbopack runtime, shared)       | ~20 kB  |
| next-intl client runtime (`@formatjs`, needed by the i18n `Link`) | 9.9 kB  |
| Application code (locale links island, providers)                 | ~5 kB   |

About 135 kB of that is the framework itself, which no application change can remove. The 130 kB budgets
were therefore unreachable before any feature was built. RULES §9.1 makes budgets release gates, and
AGENT §9.6 requires escalation when a budget cannot be met without an architecture change. Replacing
React/Next is out of the question (RULES §17).

## Decision

1. Keep measuring **gzip** of all first-load JavaScript for a route (what SPEC §12 always meant), but
   set the totals to framework baseline + an application allowance:

   | Route      | Total first-load JS (gzip) | Of which application code |
   | ---------- | -------------------------- | ------------------------- |
   | Home       | ≤ 175 kB                   | ≤ 40 kB                   |
   | Collection | ≤ 175 kB                   | ≤ 40 kB                   |
   | Product    | ≤ 195 kB                   | ≤ 60 kB                   |

   "Application code" is everything except the React DOM, Next.js runtime and Turbopack runtime chunks
   (next-intl counts as application code).

2. The bundle-size check (T11) enforces both columns in CI.
3. Lighthouse mobile ≥ 0.95 in all four categories, LCP < 2.5 s, CLS < 0.1 and TBT < 200 ms remain the
   user-facing release gates and are unchanged.
4. Lighthouse CI assertions use `aggregationMethod: 'median'` (the median of each metric across runs)
   instead of `median-run` (all metrics taken from the single run with the median performance score).
   On the 2-vCPU sandbox, LCP for identical builds varied 1.2–3.0 s between runs, so one noisy run
   decided the gate; the per-metric median is the statistically sound reading and still stricter than
   the lhci default (`optimistic`).

## Consequences

- Every client island has to fit in a 40 kB (Home/Collection) or 60 kB (Product) allowance, which keeps
  the "small islands" rule (RULES §4.1, §9.6) meaningful.
- Framework upgrades that grow the baseline will show up as a failure of the total column with the
  application column still green, which points straight at the cause.
- The case study (FR-062) reports both numbers honestly, with this ADR as the explanation.

## Note: Lighthouse noise on the 2-vCPU sandbox (added in T06 round 2)

- `lighthouserc.cjs` runs **5** collections per URL (was 3), still judged by the per-metric median.
- On this machine a single run of an unchanged build spans LCP 1.1-3.1 s and TBT 90-380 ms. Fifteen alternating
  runs per variant (T06 review) gave medians that pass every gate for the T03 build (`/en` LCP 1969 ms, TBT 152 ms;
  `/th` LCP 2245 ms, TBT 167 ms), so a 3-run autorun failed it by chance; 5 runs reduce that, they do not remove it.
  If a run fails, re-run once and report both, with the medians.
- Lighthouse's mobile LCP is a Lantern **simulation** of the page's dependency graph, not the browser's own
  measurement. On `/en` the simulated first paint is bimodal (about 0.8 s or 1.4 s) depending on how the graph is
  pruned; the slow mode moved LCP by about 0.5 s without any change in the real paint (4x CPU, slow 4G in Chromium
  itself: LCP = FCP = about 230-700 ms for both builds). Treat a single simulated LCP as an upper bound, and
  compare builds with alternating runs, not with one run each. The budgets themselves are not loosened.
