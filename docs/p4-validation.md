# P4 validation

## T6 e2e, axe and keyboard pass - 2026-11-01

Windows workstation, Chromium only (projects `mobile` 375 px, `desktop` 1280 px), production build served by
`pnpm start` on port 3000. Two builds were used:

- **Build A** (first `pnpm build`, 14.4 s): used for the full `pnpm test:e2e`, the full `pnpm test:a11y` and the
  first keyboard pass and coverage run.
- **Build B** (fresh `pnpm build` after the main-agent review changed `safe-image.tsx`, `cart-recovery-notice.tsx`,
  two unit tests and the Lighthouse workflow regex): used for `states.spec.ts` + `product-cart.spec.ts`
  on both projects, the keyboard pass re-run, the filters-drawer axe re-run, and the final coverage run. The full
  e2e and a11y suites were **not** re-run on Build B.

Before starting: nothing listened on 3000 or 3100. PID 30296 (port 3101, a `next` process from 12:02, state
FIN_WAIT_1) was left alone and still exists. I started one server per build and stopped each by PID afterwards (the
first, PID 23048, had to be killed explicitly before Build B's server could bind 3000; the second, PID 8932, was
stopped at the end; port 3000 answers nothing now).

### Gap check against T6 acceptance

All items already existed; nothing was added to `tests/`. Each runs on both projects (mobile + desktop) and en + th.

| Acceptance item                                                                                        | Where                                                                                            | Result                |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------- |
| Image blocked (`page.route` abort): placeholder, same box, labelled, axe clean                         | `states.spec.ts:32` (product gallery), `:59` (cart thumbnail), `:137` (catalogue cards stay 1:1) | pass                  |
| Corrupt cart notice (Journey 5, reset + adjusted, dismiss, focus on a control)                         | `product-cart.spec.ts:199`                                                                       | pass                  |
| Notice axe + 44 px target + Enter dismiss keeps focus off `body`                                       | `product-cart.spec.ts:235`                                                                       | pass                  |
| Search no-results: copy, axe, Shop all href, Clear search refocuses field                              | `states.spec.ts:89`                                                                              | pass                  |
| Reduced-motion drawer: `fade-in` <= 100 ms vs `slide-in-end` > 100 ms (computed style, `emulateMedia`) | `states.spec.ts:110`                                                                             | pass                  |
| Axe on new states: notice open, placeholder visible (cart line), empty search, populated drawer        | `product-cart.spec.ts:235,269`, `states.spec.ts:79,89`                                           | zero critical/serious |

Axe note: the product-gallery placeholder test (`states.spec.ts:32`) runs axe but is not tagged `@a11y`, so it runs in
`pnpm test:e2e` and not in `pnpm test:a11y`.

### Commands and results

| Command                                               | Build                 | Result                                                                                                     | Duration   |
| ----------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| `pnpm build`                                          | A                     | success                                                                                                    | 14.4 s     |
| `pnpm bundle:check`                                   | A and B (identical)   | pass, see below                                                                                            | -          |
| `pnpm test:e2e` (whole suite, both projects)          | A                     | 752 passed, 1 failed, 7 skipped (mobile 377 passed / 3 skipped, desktop 375 passed / 1 failed / 4 skipped) | 6.6 min    |
| `pnpm test:a11y`                                      | A                     | 232 passed, 0 failed                                                                                       | 2.5 min    |
| `playwright test states.spec.ts product-cart.spec.ts` | B                     | 60 passed                                                                                                  | 54 s       |
| `playwright test a11y.spec.ts -g "filters drawer"`    | A (x1, x3) and B (x1) | 4 passed; 12 passed with `--repeat-each 3`; 4 passed on B                                                  | 6-14 s     |
| `pnpm test:coverage`                                  | A, then B             | 74 files, 1094 tests passed both times                                                                     | 35.7 s (A) |

Skips are the existing viewport-conditional ones (`collection.spec.ts:563` on mobile; `product-angles.spec.ts:4` hover
en/th on mobile; `collection.spec.ts:500,544` mobile filters drawer en/th on desktop).

### Failure and classification

One failure in the full run on Build A:
`[desktop] a11y.spec.ts:104 filters drawer /th - axe: /th/shop with the filters drawer open`, at
`a11y.spec.ts:109` (`page.waitForLoadState('networkidle')` after `page.goto('/th/shop?color=black')`):
`Navigation failed because page crashed!`. The failure happens before any assertion or axe call, so it is a browser
tab crash while the whole suite ran in parallel, not an accessibility result. Classification: load-sensitive, not a
P4 regression (the file is unmodified; `git status` shows it untouched). Re-run in isolation: 4 passed. With
`--repeat-each 3`: 12 passed. Passed again in the `pnpm test:a11y` run (232 passed). I changed no test and no
timeout. The cause of the crash itself (renderer memory under 2 workers x many contexts) is not confirmed.

### Bundle check (`pnpm bundle:check`, Build A and B, identical output)

| Route                                                      | Total (gzip)    | Application (gzip) |
| ---------------------------------------------------------- | --------------- | ------------------ |
| `/en`, `/th`                                               | 164.9 / 175 KiB | 32.4 / 40 KiB      |
| `/en/shop`, `/th/collections/foundations`                  | 170.4 / 175 KiB | 38.0 / 40 KiB      |
| `/en/products/essential-tee`, `/th/products/essential-tee` | 167.1 / 195 KiB | 34.6 / 60 KiB      |

### Coverage (`pnpm test:coverage`)

74 test files / 1094 tests passed. Global: statements 80.23 %, branches 79.41 %, functions 78.45 %, lines 80.98 %
(1457 / 1799). Gate (overall >= 75 %) met. Same numbers on Build A and Build B.

### Manual keyboard-only pass

Playwright keyboard input (Tab, Enter, Escape) in Chromium at 375 and 1280 px, en and th; focus read from
`document.activeElement` and its computed outline/box-shadow. The script was a scratch file, not committed.
68 checks (17 per viewport/locale combination); run on Build A and again on Build B: 0 failures both times.

| Check                                                                                                                                                                                                                               | Result (375 en/th, 1280 en/th) |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Cart recovery notice (`/cart`, adjusted cart): Tab reaches Dismiss (6 tabs); 2 px solid focus ring visible (`rgb(31, 79, 216)`)                                                                                                     | pass x4                        |
| Enter on Dismiss removes the notice; focus lands on the first cart control (the line's product link), not `body`                                                                                                                    | pass x4                        |
| Search no-results: Tab reaches Clear search (8 tabs) with a visible 2 px ring; Enter refocuses the search field                                                                                                                     | pass x4                        |
| Search no-results: Shop all reachable by Tab (9 tabs) with a ring; Enter goes to `/{locale}/shop`                                                                                                                                   | pass x4                        |
| Cart drawer: header Cart button reachable (5 tabs), ring visible (light ring `rgb(157, 184, 255)` on the transparent hero header); Enter opens, focus moves inside after the slide; Esc closes and focus returns to the Cart button | pass x4                        |
| Product page with images blocked (`/products/essential-tee`): first 25 Tab stops identical to the page with images; no stop lands inside `[data-image-fallback]`                                                                    | pass x4                        |
| Console errors or warnings during all of the above                                                                                                                                                                                  | none                           |

Observation (not a defect against a stated rule): the Clear search button's focus ring is `rgb(20, 20, 18)` (ink),
not `--color-focus` blue as the other controls show (DESIGN 11 names `--color-focus`). It is a visible 2 px ring on a light
surface. Left to the main agent to decide whether the search box should use the shared ring.

Error boundary keyboard check: not re-run. It reuses the T1 evidence (done with a temporary throw); no throwing route
was added. The component-level unit tests cover "Try again".

### Screenshots index (`docs/screenshots/p4/`, 36 files, not produced by this task)

| Files                                                                                         | Content                            |
| --------------------------------------------------------------------------------------------- | ---------------------------------- |
| `cart-notice-page-{en-usd-adjusted,en-thb-reset,th-usd-reset,th-thb-adjusted}-{375,1280}.png` | recovery notice on `/cart`         |
| `cart-notice-drawer-<same four combinations>-{375,1280}.png`                                  | recovery notice in the cart drawer |
| `error-{en,th}-{mobile,desktop}.png`                                                          | route error panel                  |
| `image-fallback-{cart,product,shop}-{en,th}-{375,1280}.png`                                   | image placeholder states           |
| `search-empty-{en,th}-{375,1280}.png`                                                         | search with no results             |

### Not done

- Screen-reader smoke (VoiceOver/NVDA) on the new states: owner-run, not done.
- Deployed Lighthouse run and production checks: T9, blocked on the owner.
- Reduced motion is verified by emulation (`prefers-reduced-motion: reduce`) only, not on a real device.
- Full `pnpm test:e2e` and `pnpm test:a11y` were not repeated on Build B (only the two specs named above, the
  filters-drawer axe test, the keyboard pass and coverage).
- The cause of the one browser-tab crash is not diagnosed.
