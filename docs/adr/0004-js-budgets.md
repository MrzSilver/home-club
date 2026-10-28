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

## Amendment: where the Lighthouse gates run (T07 round 2, owner decision 2026-10-28)

- **Context.** The Home page's Lighthouse LCP gate failed intermittently on the 2-vCPU sandbox even for pages
  whose real paint is fast. Lighthouse's mobile LCP is a Lantern simulation fed by an unthrottled localhost trace,
  so it depends on how much of the page's early requests and CPU work lands before the observed first paint, and
  that varies with machine load. T07 review: simulated LCP for the same build spanned 1.9-3.6 s, and the T06 build
  (before the Home page existed) also exceeded 2.5 s in some runs. With applied (devtools) throttling the same
  pages measured LCP 1.6 s with a 60-180 ms spread (4 runs per build, T07 review). The page was not the problem;
  the measuring place was.
- **Decision.** The performance gates (score >= 0.95, LCP < 2.5 s, TBT < 200 ms) are enforced by Lighthouse against
  the **deployed Vercel preview**, not against the sandbox. The thresholds are unchanged.
  - `lighthouserc.cjs` reads `LHCI_BASE_URL`. Set: no local server, the routes load from that base and **every**
    assertion is an `error`. Unset (sandbox, local, the `verify` job in `ci.yml`): `pnpm start` serves the build;
    accessibility, best-practices and SEO scores and CLS stay `error` (deterministic), while performance score, LCP
    and TBT are `warn` (informational).
  - `.github/workflows/lighthouse-preview.yml` runs on `deployment_status` (state `success`, environment `Preview`),
    checks out the deployed SHA and runs `pnpm lhci` with `LHCI_BASE_URL` set to the deployment's `target_url`. It is
    the real release gate for those three metrics; make it a required check on `main` once the repository exists.
  - Builders still run `pnpm lhci` locally, report the per-metric medians every task and must not regress them
    knowingly. `aggregationMethod: 'median'` and 5 runs per URL apply in both modes.
- **Consequences.** A local `pnpm lhci` exits 0 on a slow machine and shows the perf warnings; a regression in the
  deterministic categories still fails locally. Until the repository and Vercel project exist (owner task) the
  performance gate has no automatic enforcement: the local medians in each build report are the only evidence.
  If the preview sits behind Vercel deployment protection, Lighthouse would audit the login page; keep Preview
  deployments public for this repository or add a protection-bypass header (not configured here).
