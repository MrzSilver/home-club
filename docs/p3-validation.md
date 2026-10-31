# P3 validation

## P3 Preview run - 2026-10-31

Measured against the Vercel Preview of commit `a3a65a2` (branch `feat/p3-seo-builders`, PR #8):
`https://home-club-git-feat-p3-seo-builders-silversvs-projects.vercel.app`.
`lighthouserc.cjs` was not changed. Command: `LHCI_TARGET=preview LHCI_BASE_URL=<preview> pnpm lhci`
(Lighthouse 12.6.1, mobile, 5 runs per URL, median aggregation, 8 URLs, 40 runs, from the owner
workstation, not the GitHub workflow). The preflight (`node scripts/check-preview-headers.mjs`) confirmed
all 8 URLs return 200 with `X-Robots-Tag: noindex`.

Machine-readable summary: [p3-deployed-audit.json](./p3-deployed-audit.json). Full reports (40 LHR JSON/HTML
files) are in the git-ignored `.asset-sources/p3-preview-a3a65a2/`, as in P1/P2.

The case-study route does not exist at this commit, so it was not measured.

### Assertions

All error-level assertions passed (performance, accessibility, best-practices, LCP, TBT, CLS, and the
Preview SEO audits `document-title`, `meta-description`, `http-status-code`, `link-text`,
`crawlable-anchors`, `image-alt`, `hreflang`, `canonical`). One warning per URL (8 total):
`categories.seo` expected >= 0.95, found 0.69 on every run of every URL. The only failing SEO audit in every
run's report is `is-crawlable` (Preview is intentionally noindex; ADR-0004 amendment), which the Preview
config sets to `off`.

### Results (medians)

| Route                          | Perf | A11y |  BP |  SEO |  LCP ms | TBT ms |     CLS |
| ------------------------------ | ---: | ---: | --: | ---: | ------: | -----: | ------: |
| `/en`                          | 0.97 |    1 |   1 | 0.69 | 2434.45 |     86 |       0 |
| `/th`                          | 0.95 |    1 |   1 | 0.69 | 2431.77 |     97 |       0 |
| `/en/shop`                     | 0.98 |    1 |   1 | 0.69 | 2234.54 |    117 |       0 |
| `/th/collections/foundations`  | 0.97 |    1 |   1 | 0.69 | 2443.36 |     97 | 0.00028 |
| `/en/products/essential-tee`   | 0.99 |    1 |   1 | 0.69 | 2022.33 |     64 |       0 |
| `/th/products/essential-tee`   | 0.96 |    1 |   1 | 0.69 | 2462.49 |    102 |       0 |
| `/en/looks/the-essential-look` | 0.97 |    1 |   1 | 0.69 | 2291.61 |    111 |       0 |
| `/th/looks/the-essential-look` | 0.97 |    1 |   1 | 0.69 | 2433.68 |    100 |       0 |

### Comparison with the P2 deployed run

P2 numbers are in `docs/p2-deployed-audit.json` on branch `origin/codex/p2-look-builder` (commit `dc3cb22`,
not yet merged into this branch), measured on `878fcb0`. Performance / LCP ms / TBT ms, P2 then P3:

| Route                          | Perf       | LCP ms           | TBT ms  |
| ------------------------------ | ---------- | ---------------- | ------- |
| `/en`                          | 0.97, 0.97 | 2438.98, 2434.45 | 63, 86  |
| `/th`                          | 0.97, 0.95 | 2293.87, 2431.77 | 65, 97  |
| `/en/shop`                     | 0.97, 0.98 | 2286.91, 2234.54 | 73, 117 |
| `/th/collections/foundations`  | 0.97, 0.97 | 2435.37, 2443.36 | 87, 97  |
| `/en/products/essential-tee`   | 0.98, 0.99 | 2287.89, 2022.33 | 62, 64  |
| `/th/products/essential-tee`   | 0.99, 0.96 | 1994.33, 2462.49 | 50, 102 |
| `/en/looks/the-essential-look` | 0.97, 0.97 | 2429.47, 2291.61 | 52, 111 |
| `/th/looks/the-essential-look` | 0.96, 0.97 | 2438.21, 2433.68 | 56, 100 |

TBT is higher on all 8 routes and LCP is higher on 3 of 8 routes; all remain inside
the budgets (LCP < 2500, TBT < 200). `/th` performance dropped to 0.95, the minimum allowed, and
`/th/products/essential-tee` LCP is 2462.49 ms, 37.5 ms under the limit; there is little headroom on these two.
Single runs on a workstation vary (the P2 file shows runs from 1982 to 2582 ms for identical builds), so these
differences are not attributed to a specific change.

### Canonical and hreflang on Preview

`NEXT_PUBLIC_SITE_URL` is unset on this Preview, so the HTML emits `rel="canonical"` and `hreflang`
alternates pointing at `http://localhost:3000/...` (verified with `curl` on `/en`: canonical
`http://localhost:3000/en`, alternates `en`, `th`, `x-default` on `localhost:3000`). Lighthouse nevertheless
scored the `canonical` and `hreflang` audits 1 (pass) on all 40 runs: both audits check that the tags are
well-formed and absolute, not that the host matches the page. Neither produced a warning or error, so there is
no blocked run. The localhost host is a Preview configuration gap that Lighthouse does not detect; it must be
checked on Production (or with `NEXT_PUBLIC_SITE_URL` set on Preview), since these audits would not catch it.

### Note on the lhci upload step

`LHCI_TARGET=preview` is also read by `lhci` as its `--target` (upload) option, so the final `upload` step
failed with `Invalid values: Argument: target, Given: "preview"` and the autorun printed
`WARNING: upload command failed.` The collect and assert steps completed first, the process exited 0, and
reports were written to `.lighthouseci/` as configured. The same variable is used by
`.github/workflows/lighthouse-preview.yml`, so the same message is expected there.

## T7 accessibility and E2E - 2026-10-31

Commands run on the production build (`pnpm build && pnpm start`, started by Playwright), Windows
workstation, Chromium only (projects `mobile` 375 px and `desktop` 1280 px).

### Route manifest and axe sweep (RULES 8.8)

`tests/e2e/routes.ts` generates every public path from the seed data (`@/data`) and reads the journal slugs
from `src/content/journal/en/*.mdx` (the loader `src/content/journal.ts` imports MDX, which Playwright cannot
load). `journeys.spec.ts` asserts that every URL in `sitemap.xml` is in the manifest.

| Item                                                                                                                                                                      | Count |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----: |
| Public paths: home, shop, 4 collections, 12 products, looks index + 1 look, vibes index + 5, journal index + 3, search, cart, checkout, checkout/success, case-study, 404 |    37 |
| x 2 locales                                                                                                                                                               |    74 |
| Query-string states (filter chips, empty state)                                                                                                                           |     2 |
| Axe route tests per project                                                                                                                                               |    76 |
| Interaction-state axe tests per project (menu open x2, filters drawer x2)                                                                                                 |     4 |

`pnpm test:a11y`: 220 passed, 0 failed (110 per project), 3.3 min. Every route test now also fails on a console
error or warning (hydration), a `securitypolicyviolation` event, a page error, or any request with status >= 400.
The only allowance: Chromium logs the 404 status of the document itself as a console error, so on the 404
route that one message is ignored (a failing image or script on that route still fails the test).
Zero critical or serious axe violations on all 76 routes x 2 projects.

### Journeys (SPEC 14)

| Journey                                                     | Where                                                       | Result                   |
| ----------------------------------------------------------- | ----------------------------------------------------------- | ------------------------ |
| 1 browse, filter, variant, add, quantity, checkout, confirm | `journeys.spec.ts` (en, th x mobile, desktop)               | 4 of 4 pass              |
| 2 look, discount, remove one, discount removed              | `look.spec.ts` ("Journey 2: ...", renamed in place)         | 4 of 4 pass              |
| 3 locale and currency persist across reload and navigation  | `journeys.spec.ts` (en, th x mobile, desktop)               | 4 of 4 pass              |
| 4 out-of-stock slot, atomic failure, alternatives           | `look.spec.ts` ("Journey 4: ...", renamed in place)         | pass; 1 flake, see below |
| 5 corrupt localStorage recovery                             | `product-cart.spec.ts` ("Journey 5: ...", renamed in place) | 4 of 4 pass              |

`pnpm test:e2e --grep Journey` finds all five.

### Full E2E run

`pnpm test:e2e`, second run: 705 passed, 4 failed, 7 skipped, 7.3 min. Per project: mobile 353 passed / 2 failed
/ 3 skipped, desktop 352 passed / 2 failed / 4 skipped. The skips are the existing viewport-conditional skips
(desktop sidebar test on mobile, mobile drawer tests on desktop, hover test on mobile).

Failures, none caused by T7 changes (test code under them is unmodified, `src/` is unmodified):

- `shell.spec.ts:256` "menu: opens from the keyboard, traps focus, hides the page ..." in en and th, on both
  projects (4 failures, deterministic: fails in isolation too). With the menu open, `getByRole('main')` still
  resolves to one element (`expect(...).toHaveCount(0)` at line 268); the snapshot shows the children of `main`
  as `aria-hidden` but `main` itself not hidden. Likely cause (not confirmed): the hero carousel's
  `<div role="status" class="sr-only">` (`src/components/home/hero-carousel.tsx:121`) is a live region inside
  `main`, and the aria-hidden helper used by Radix does not hide ancestors of live regions. Impact: the
  background is not fully inert for assistive technology while the menu is open (RULES 8.6). Needs the owner or
  a builder to decide: move the live region out of `main`, or adjust the contract.
- First run only (not reproduced in the second run or in isolation): `home.spec.ts:267` "cross-fade keeps the
  outgoing slide rendered" mobile en (a 120 ms wait racing a 400 ms transition under load) and `look.spec.ts:44`
  "Journey 4 ... en" on both projects (alert not found after the Add click; passed in isolation and in the second
  full run). Both look like load-sensitive timing; not changed.

### Flaky unit test

`tests/unit/components/mobile-nav.test.tsx` timed out in `findByRole('dialog')` only in full-suite runs. Cause:
`MobileNav` loads its drawer with `import('@/components/layout/mobile-nav-panel')` on first open; in the first
test of the file that import is cold, so Vite transforms the Radix Dialog graph inside the test, and with 62
files running in parallel it can exceed `findBy*`'s 1000 ms default. The cause is in the test, not the
component. Fix: `beforeAll` imports the panel module once (60 s timeout of its own) so the component's import
resolves from the module cache; no assertion timeouts were raised. The slow-link path stays covered
deterministically by `mobile-nav-loading.test.tsx` (gated module). Evidence: `pnpm exec vitest run` three times
after the fix: 62 files / 991 tests passed each time (23.4 s, 23.8 s, 23.8 s); `pnpm check` also green. The
flake was intermittent, so three green runs are consistent with the fix but cannot prove it.

### Manual keyboard-only pass

Driven with Playwright keyboard input in Chromium at 375 and 1280 px, en and th; focus observed through
`document.activeElement` and its computed outline or box-shadow. Scripts were scratch files, not committed.

| Check                                                                                                                                                                                                          | Result |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Case study (4 combinations): first Tab is the skip link; Enter moves focus to `main`                                                                                                                           | pass   |
| Case study: 15 (375) or 15-16 (1280) tab stops, in reading order; every stop shows a focus ring and is in the viewport                                                                                         | pass   |
| Case study: external links say they open in a new tab; no horizontal overflow                                                                                                                                  | pass   |
| Footer: category links and case-study link reachable; newsletter field has a ring; Enter submits and the status line reads the demo message (en, th)                                                           | pass   |
| Product page: gallery region, front/back/side buttons, colour, size, Add reachable by Tab; Space picks a size, Enter on Add opens the drawer with focus inside; Esc returns focus to Add (en, th, both widths) | pass   |
| Console warnings or errors during the above                                                                                                                                                                    | none   |

Reduced motion: covered by existing specs (`home.spec.ts` reduced-motion carousel tests); not re-run as a
separate manual check beyond the full E2E run.

Not done: the screen-reader smoke (VoiceOver/NVDA) for the P3 pages is owner-run (E6) and has not been done.

### Main-agent review of T7 - 2026-10-31

- **Menu not hiding the page (the shell.spec menu failure):** a P3 regression from T2, not the hero live region.
  Radix's `aria-hidden` (`hideOthers`) never hides a `<script>` or an `[aria-live]` element, nor their
  ancestors. The JSON-LD `<script>` sat inside `<main>` on Home, product and article pages, so `<main>` stayed
  exposed to assistive technology while the modal menu was open (RULES 8.6). Shop and collections were fine
  (their script was already outside `<main>`). Fix: the `JsonLd` element now renders as a sibling before
  `<main>` on those three pages. New test in `shell.spec.ts` ("menu hides the page on ..., which carries
  structured data") for Shop, a product and an article, en and th: it failed for product and article (and
  the existing Home test failed) before the fix, and passes after it.
- **`home.spec.ts` cross-fade:** deterministic under parallel load (16/16 failed with `--repeat-each 4`),
  8/8 passed with `--workers=1`, and it also failed without the JSON-LD fix. So the timing was fragile,
  not a P3 regression. The test waited 120 ms in the test process and then read styles, and the round
  trip between processes could land after the 400 ms fade. Fix: the click and the mid-fade read now
  happen in one in-page task, two animation frames after the click. The assertion is unchanged (both
  slides still drawn mid-fade). Evidence: 16/16 passed with `--repeat-each 4` in parallel.
- **`mobile-nav-loading.test.tsx`:** the same cold-import flake as `mobile-nav.test.tsx` (it failed once
  in a full `pnpm check`). Fix: `beforeAll` loads the real panel module past the mock with
  `vi.importActual` (60 s timeout of its own). The gate still decides when the panel appears. Evidence:
  `pnpm exec vitest run` three times, 991/991 each.
- **Wheel-scroll header test (`shell.spec.ts:185`):** it timed out (30 s default) in a shell-only run and in
  one full run, and passed 12/12 alone. It does 80 wheel steps, each with a 90 ms settle and two round trips,
  which takes about 15 s alone and 35–40 s under a full parallel run. Fix: `test.setTimeout(90_000)` with that
  explanation; no assertion changed. Evidence: shell and home specs `--repeat-each 2` in parallel, 320/320
  passed (this test 18.5 s).
- **Journey 4 en:** QA saw one first-run failure. It passed in every later run; still noted as load-sensitive.
