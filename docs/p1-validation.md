# P1 implementation and validation — 2026-10-28

Task: finish P1 T09–T11 — FR-001, FR-030–033, FR-050–051, FR-070–073.

Status: **partial phase exit**. P1 functionality and automated validation are implemented. The Home performance score and several local LCP measurements remain below the release targets; this report does not mark P1 fully closed.

## Implemented

- Static Product pages for every catalogue slug × locale × hidden currency segment, with localized metadata and real 404s for unknown slugs.
- Swipe/keyboard-scroll gallery, thumbnails, colour/size radios with unavailable options disabled, low-stock notices and stock-bounded quantity/add controls.
- Per-tree Zustand cart, hydration-safe header count, lazy Radix drawer and `/cart`. Quantity changes/removal/subtotals use current catalogue stock/prices and current currency.
- Version-1 storage validated with strict Zod mini schemas. Invalid/unsupported data resets safely; retired SKUs disappear, reduced stock clamps quantities, duplicates merge, and storage failures keep in-memory use working. Empty carts remove the key. No prices, totals or personal data are persisted.
- Home/card viewport prefetch disabled after real network traces exposed speculative Collection downloads and newsletter/filter regressions. Existing locale/currency behavior remains covered.
- CI JavaScript-budget gate and Product Lighthouse/axe targets. README/SPEC/DESIGN updated; architecture/dependency rationale is in [ADR-0007](adr/0007-p1-product-cart.md).

## Verification

| Check                                                               | Result                                                                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                        | Passed: typecheck, lint, 829 unit/component tests in 54 files, production build                                |
| `pnpm test:coverage`                                                | Passed: overall lines 94.89%; `src/lib` lines 98.76%                                                           |
| Full Playwright suite                                               | 381 passed, 5 skipped, no failures; skips are viewport-inapplicable drawer/sidebar tests                       |
| Follow-up Home/Product/Cart suite after final prefetch/copy changes | 90 passed                                                                                                      |
| Additional stale-cart recovery and newsletter isolation checks      | 8 passed, including removal of retired SKUs and stock clamp on reload                                          |
| Accessibility                                                       | axe checks and keyboard modal focus/return checks passed in both locales and viewport projects                 |
| Visual evidence                                                     | Product, cart and drawer screenshots at 375 and 1280 CSS px in EN/TH × USD/THB; no Product horizontal overflow |
| Unknown Product URLs                                                | HTTP 404 in both locales                                                                                       |
| `pnpm bundle:check`                                                 | Passed all total/application budgets                                                                           |

The browser counts above describe separate runs, not a sum of unique tests. `test-results/` contains current screenshots; the `recovery-check/` subdirectory contains the last recovery/newsletter run. Screenshots were also inspected for layout and Thai text clipping. Automated keyboard/axe evidence is not a manual VoiceOver/NVDA pass.

## JavaScript budgets

Chromium measures actual script responses during a fresh empty-cart load, including automatically imported code. Bodies are gzipped at level 9. The report is generated at `.next/bundle-report.json`. The server starts on port 3100 unless `BUNDLE_BASE_URL` points to an existing build.

| Route type            | Total / budget, KiB | Application / budget, KiB |
| --------------------- | ------------------- | ------------------------- |
| Home, EN and TH       | 165.1 / 175         | 33.0 / 40                 |
| Collection, EN and TH | 170.7 / 175         | 38.6 / 40                 |
| Product, EN and TH    | 166.5 / 195         | 34.5 / 60                 |

The fresh-load measurement excludes the on-demand validator used when a saved cart exists. Framework exclusion is based on the current Next.js root/runtime chunk manifests; review classification when upgrading the framework. Mixed application chunks and next-intl count against the application allowance.

## Lighthouse baseline

Mobile Lighthouse, Chromium 153, the repository's existing throttling and five runs per URL. Values below are medians. Accessibility, Best Practices and SEO are **100 on every target**. Local assertion errors passed; performance/LCP warnings remain warnings according to the existing ADR-0004 policy. Thresholds were not relaxed.

The first collection covered all six URLs (30 runs). After removing Home speculative prefetch, only Home was remeasured (10 runs); other rows retain their initial baseline. The final Home build ID was `B2zQEb9G-rBsCvoZPLCmF`.

| URL path                      | Performance | LCP, ms | CLS    | TBT, ms |
| ----------------------------- | ----------- | ------- | ------ | ------- |
| `/en`                         | 94          | 3037    | 0.0000 | 78      |
| `/th`                         | 93          | 2974    | 0.0138 | 96      |
| `/en/products/essential-tee`  | 97          | 2592    | 0.0000 | 51      |
| `/en/shop`                    | 96          | 2206    | 0.0000 | 98      |
| `/th/collections/foundations` | 96          | 2665    | 0.0000 | 65      |
| `/th/products/essential-tee`  | 96          | 2667    | 0.0000 | 59      |

Before the Home prefetch change, Home medians were EN 94 / TH 92; the final values are EN 94 / TH 93. This removes unnecessary network/code loading but does not establish a Home LCP improvement. The LCP image is already discoverable, eagerly loaded and high priority; remaining delay is predominantly rendering in the local trace.

Raw final Home reports and HTML are in `.lighthouseci/`; the original six-target reports are retained in `.lighthouseci/initial-baseline/`. Generated reports/screenshots are intentionally ignored by Git.

To reproduce after a production build and browser installation:

```bash
pnpm check
pnpm test:coverage
pnpm exec playwright install --with-deps chromium
pnpm bundle:check
CI=true pnpm test:e2e
# Stop any server using port 3000 before autorun; point CHROME_PATH at the installed Chromium if needed.
pnpm lhci
```

In this cloud session the retained toolchain is enabled with `export PATH=/workspace/.cloud-tools/node_modules/.bin:$PATH`; the browser cache is selected with `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright`. Lighthouse used `CHROME_PATH=/workspace/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`.

## Remaining phase-exit work

- Home has not met the ≥95 performance target in this local baseline. LCP also exceeds 2.5 seconds on some targets. The existing Vercel Preview workflow is the strict deployment gate; no matching deployment audit was performed here. Further performance work and that gate remain outstanding.
- A real assistive-technology smoke pass on VoiceOver/NVDA has not been performed in the cloud machine.
- Placeholder imagery remains the existing documented demo imagery; no new assets were added. Public-launch asset replacement stays in P4.

Assumptions: P1 scope follows PRD/SPEC T01–T11. Search, Look builder, size guide and checkout remain P2. No backend, payment or account scope was introduced.

Changed: Product/Cart UI and routes, cart state/validation helpers, localized messages, prefetch policy, regression tests, CI budget checker and the linked documentation.

Docs/ADR/ASSETS updated: README, SPEC, DESIGN, ADR-0007 and this report; ASSETS unchanged because existing assets were reused.

Needs owner review: the implementation and the outstanding performance/assistive-technology phase-exit checks. Application deployment and environment publication are outside this validation report.
