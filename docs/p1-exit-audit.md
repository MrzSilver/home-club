# Phase 1 exit audit — 2026-10-29

Status: functionality complete; strict phase exit **not yet passed**. Phase 2 has not started.

## Current evidence

- PR #5 is merged. [Main CI run](https://github.com/MrzSilver/home-club/actions/runs/40829772697)
  for `558dd1f9d7d155fea5f94d456ac64a00e0ceb0da` completed successfully, including lint,
  formatting, coverage, production build, JavaScript budgets and full E2E/accessibility.
- The final local accessibility-fix run passed 403 browser tests with 7 conditional skips;
  the previously failing gallery label/name cases passed in both locales and viewports.
- The owner confirmed in this chat that the product/cart screen-reader smoke test passed.
  This is owner-provided evidence, not a screen-reader run performed by the agent.
- Deployed URL supplied by the owner: `https://home-club-eight.vercel.app`.

## Strict deployed Lighthouse audit

Ran the existing `lighthouserc.cjs` against the supplied deployment via `LHCI_BASE_URL`, using
five default-mobile Lighthouse 12.6.1 runs per URL, six URLs, median aggregation and the
unchanged release thresholds. All four category scores are at least 95 on every route.

| Route                         | Performance | Accessibility / Best Practices / SEO | LCP median, ms |
| ----------------------------- | ----------: | ------------------------------------ | -------------: |
| `/en`                         |          95 | 100 / 100 / 100                      |       2450.948 |
| `/th`                         |          97 | 100 / 100 / 100                      |       2427.214 |
| `/en/shop`                    |          97 | 100 / 100 / 100                      |       2309.752 |
| `/th/collections/foundations` |          96 | 100 / 100 / 100                      |   **2513.533** |
| `/en/products/essential-tee`  |          97 | 100 / 100 / 100                      |       2292.370 |
| `/th/products/essential-tee`  |          96 | 100 / 100 / 100                      |       2474.625 |

TBT and CLS medians passed all routes. The **only failed assertion** was Thai Foundations LCP:
2513.533 ms against a 2500 ms maximum. LHCI exited 1. The five values were 2587.1795,
2438.7915, 2521.2940, 2513.5330 and 2510.7275 ms. Being only 13.533 ms over is still a failure;
no threshold was relaxed and no extra runs were selected to obtain a pass.

The [machine-readable summary](./p1-deployed-audit.json) records the measurements. Full reports
remain in ignored `.asset-sources/p1-strict/.lighthouseci/`. This is a direct deployed-site audit;
it is not a claim that the separate Vercel Preview workflow ran successfully.

## Investigations and retained changes

Local diagnostic runs compared the unchanged build with synchronous Hero image decoding and
with Next.js experimental inline CSS. Neither established a reliable LCP improvement. Both
experiments were reverted; neither feature is enabled in the final source. These were single-run
diagnostics per locale, not the five-run deployment gate above.

The failing route's LCP element is the first product card's front photograph. The hidden
hover photograph was also requested at High priority. The candidate sets only the hidden
photograph to `fetchPriority="low"`, keeping the visible photograph's existing preload.
Browser network tests verify High/Low priorities in both locales and viewports. Hover and
colour selection retain the same images, dimensions and behavior.

A preliminary three-run local diagnostic reduced median LCP from 2706.794 ms to 2460.684 ms,
but included an extra front-image priority hint removed after independent review to follow
the bundled Next.js guidance. These noisy local measurements do not establish deployment
acceptance. The retained change still requires the unchanged strict deployed audit.

The main CI log also showed that the Lighthouse report upload found no files because its target
directory is hidden (`.lighthouseci`). The retained CI adjustment explicitly includes hidden files
for that local Lighthouse-report artifact, preserving future evidence. It changes neither budgets
nor assertion severity, does not change the Vercel preview job and introduces no new dependency.

Under AGENT.md §9, the owner was asked whether to continue performance investigation before
phase exit, or carry this LCP item forward while beginning Phase 2. The owner chose to fix
performance first. The threshold remains unchanged and P2 is not authorized to start yet.

## Candidate verification

- Typecheck and full ESLint passed. The card/Lighthouse unit subset passed 20 tests.
- Network priority regression: 4 passed (EN/TH, mobile/desktop).
- Hover, gallery, colour selection and axe subset: 48 passed, 2 touch-only hover skips.
- Full `pnpm check` was attempted and failed in the unit stage: 814 passed, 20 failed.
  The failures are in existing Windows path handling (Tailwind stylesheet resolution and
  import-graph separators) and two mobile-nav asynchronous dialog tests. No tests or
  lint rules were disabled. Full Linux CI remains required for this candidate.
- Independent read-only review found no blocker and recommended removing the redundant
  front-image priority hint; that recommendation was applied.
