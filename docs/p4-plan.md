# P4 plan: Polish (motion, empty/error states, assets, deploy)

Planner output (AGENT.md §3, §12). Scope is PRD §6 P4 and SPEC §17 tasks 23 to 25. OG images are done (ADR-0011); FR-044 stays in the backlog (P3 E7).
Branch `feat/p4-polish`, cut from `main` after PR #8. Findings come from reading the repo on 2026-11-01; nothing was run.

## Already in place (do not redo)

- **Motion tokens and reduced motion**: `--dur-fast/base/slow` and `--ease-standard` (`src/styles/tokens.css:103-105`); the reduced-motion block
  (`src/styles/globals.css:442-461`) shortens durations, limits `transition-property` to opacity and colour, and stops animations. Hero cross-fade
  (`globals.css:261-290`), header solid/scrim cross-fade (`header-surface.tsx:67-71`), category tile image scale 1.03 and arrow shift
  (`category-tile.tsx:36,42`), product card back-view crossfade (`product-card-preview.tsx:67`), start-side drawer slide and scrim fade
  (`globals.css:331-348`, used by menu and filter drawers). Framer Motion and `lucide-react` are **not installed** (`package.json`); everything is CSS. Keep it so.
- **Empty and error states** (SPEC §13a), audited one by one:

| State                       | Status  | Evidence and gap                                                                                                                                                 |
| --------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty cart (drawer, /cart)  | exists  | One component, `cart-contents.tsx:31-39`: `role=status` copy and a "continue shopping" button. Both locales.                                                     |
| Filters, zero results       | exists  | `catalogue-results.tsx:28-31`: heading, sentence, "Clear filters" primary action; focus kept (`catalogue-explorer.tsx:81`).                                      |
| Search, zero results        | partial | `search-box.tsx:44` shows a sentence only; no recovery action (SPEC §13a requires one).                                                                          |
| 404                         | exists  | `src/app/not-found.tsx:20-48`: bilingual, server-rendered, links to `/en` and `/th`.                                                                             |
| Image load failure          | missing | 13 `next/image` sites (e.g. `gallery.tsx:33,68`, `cart-line.tsx:37`, `look-slot.tsx:45`, `product-card-preview.tsx:47,59`); no `onError` anywhere.               |
| Out-of-stock variant        | exists  | `product-details.tsx:83,114,121-126` (text "unavailable", sold-out label), card `Sold out` (`product-card.tsx:52`). E2E covers the look slot.                    |
| Look atomic-add failure     | exists  | `look-slot.tsx:105` per-slot status plus alternatives; `look.spec.ts:44`. Not re-planned.                                                                        |
| Corrupt persisted cart      | partial | Recovers (`cart.ts:34-38`, journey 5) but **silently**: no message that the saved cart was reset or that lines were dropped (`normalizeCart`). No recovery copy. |
| Checkout validation errors  | exists  | Error summary `role=alert`, focus moved (`checkout-form.tsx:51-53,62-69`). The empty-checkout `<p>` (`:32`) lacks `role=status` (minor).                         |
| Route error (runtime throw) | missing | No `error.tsx` or `global-error.tsx` under `src/app`. A render error shows Next's default English-only screen. PRD §8 "Resilience" is not met for this case.     |

- **Deploy plumbing**: Production is https://home-club-eight.vercel.app; `vercel.json` only disables the preview feedback widget. The E5 build guard is in
  `lib/env.ts` (fails a Production build without a public https `NEXT_PUBLIC_SITE_URL`). CI (`ci.yml`) runs typecheck, lint, format, coverage, build,
  bundle budgets, e2e/axe and a local Lighthouse run. `lighthouserc.cjs` takes `LHCI_BASE_URL`; without `HC_AUDIT_TARGET=preview` (renamed from `LHCI_TARGET` in T10) every assertion
  including SEO is an error, which is what a Production run needs. The case study reads its numbers from `docs/p{1,2,3}-deployed-audit.json`
  (`src/content/case-study.ts:3-5,131-133`, Zod-validated), so a new audit file extends it with no invented numbers.
- No `TODO(#` without an issue exists in `src/` (grep: no TODO at all). The only untracked follow-up is the flaky `mobile-nav.test.tsx` (P3 T3 note: no issue number recorded).

## Task order

T7 and T8 (docs and tests only) can run any time. Code tasks are sequential: **T1 -> T2 -> T3 -> T4 -> T5 -> T6**, because T1-T4 all add keys to
`messages/en.json` and `messages/th.json`, and T1/T5 own `layout.tsx` / `globals.css` respectively. T9 and T10 wait for the owner. Each task <= ~400 changed lines.
Budget rule for every code task: `/en/shop` app JS is 39.9/40 KiB (ADR-0004). Nothing here may add client code to catalogue pages; run `pnpm bundle:check`.

### T1. Localised route error boundary (and global-error decision)

- Phase / IDs: P4, PRD §8 Resilience, SPEC §13a, RULES §6.1. Owner: frontend-builder. Reviewer: reviewer. Agent-doable now.
- Goal: a runtime error inside a locale shows a bilingual, branded recovery screen with the header and footer intact, instead of Next's default.
- Acceptance:
  - `src/app/[locale]/error.tsx` (client component, required by Next): heading, one sentence, a "Try again" button calling `reset()`, and a link home. One `h1`, focus moved to the heading on mount, no stack trace or `digest` shown. Error logged with `console.error` only (allowed: real error path).
  - Strings live in a new `errorPage` namespace in **both** catalogues. They reach the client through a **scoped** `NextIntlClientProvider messages={pick(...)}` added in `[locale]/layout.tsx` (the current provider carries no messages, SPEC §4), so the boundary does not import whole catalogues into every page's JS. Thai copy flagged `needs-review`.
  - `global-error.tsx`: decide by measurement. It must define `<html>` and `<body>`, cannot use the provider, and would have to bundle both catalogue subsets. Recommend **not shipping it** unless `pnpm bundle:check` shows < 1 KiB gzip on Home/Shop; record the decision (and the measured size) in the PR. If shipped it shows English and Thai blocks like `not-found.tsx`, imports only an `errorPage` subset, never the whole JSON.
  - Static prerender unchanged (`pnpm build` still lists SSG routes only); CSP unchanged (no inline script added).
  - Component test (RTL) renders the boundary in en and th, presses "Try again", asserts `reset` is called. (A throwing route cannot be added for e2e: new routes are out of scope; see T6.)
- Files: `src/app/[locale]/error.tsx`, `src/app/[locale]/layout.tsx`, `messages/*.json`, `tests/unit/components/`. Out of scope: Sentry or any reporting service. Dependencies: none. Verification: unit, build, bundle check, screenshots 375/1280 en/th.

### T2. Corrupt or stale cart: tell the visitor (SPEC §13a, journey 5)

- Phase / IDs: P4, FR-051, SPEC §13a. Two sub-steps. Reviewer: reviewer. Agent-doable now, after T1 (shared `messages/*`).
- Goal: when saved cart data is unreadable, or lines were dropped because of removed/sold-out SKUs, the cart says so once and offers a way forward.
- T2a (logic-builder, `src/lib/cart.ts`, `src/store/cart.ts`, `tests/unit`): `normalizeCart` / hydration report a transient `recovery: 'reset' | 'adjusted' | null` in memory. **Nothing new is persisted** (so no escalation); it is not written to localStorage and clears on dismiss or the next change. Tests: corrupt JSON, wrong version, extra fields, stale SKU, over-stock clamp; each yields the right flag, valid carts yield `null`.
- T2b (frontend-builder, `cart-contents.tsx`, cart drawer, `messages/*`): a `role=status` notice above the lines ("Your saved cart could not be read and was cleared" / "Some items were updated because stock changed"), a dismiss button (>= 44 px), and the empty state's existing Shop link as the recovery action. en and th; no concatenated sentences.
- Acceptance: extend the existing corrupt-storage e2e (`product-cart.spec.ts:192`) to assert the notice in en and th on both viewports; no hydration warning (notice renders after `hydrated`).

### T3. Image failure fallback (SPEC §13a)

- Phase / IDs: P4, SPEC §13a, RULES §4.8. Owner: frontend-builder. Reviewer: reviewer. After T2. Agent-doable now.
- Goal: a failed product/brand image shows a neutral `surface` placeholder that keeps the alt text and the layout box (CLS 0).
- Acceptance:
  - One shared wrapper (`src/components/ui/safe-image.tsx`, client) used where cost allows: gallery, cart line, look slot, vibe page. **Catalogue cards and the shop grid are excluded** (client budget, 39.9/40 KiB): there the `surface` backdrop already sits behind the image; verify with a blocked image that the box stays 1:1 and the alt text remains available, and record the result. If the wrapper costs > 0.5 KiB on any budgeted route, switch to CSS-only for that route.
  - Placeholder is not colour-only: it shows the localised alt text (reusing existing alt strings; one new short key `common.imageUnavailable` in both catalogues if a caption is needed).
  - Unit test: `error` event swaps to the placeholder, `alt` preserved. E2E in T6.
- Files: `src/components/ui/safe-image.tsx`, the four call sites, `messages/*`. Dependencies: T2. Verification: unit, `pnpm bundle:check`, screenshots with images blocked.

### T4. Small empty-state gaps

- Phase / IDs: P4, SPEC §13a. Owner: frontend-builder. After T3. Agent-doable now.
- Acceptance:
  - Search zero results (`search-box.tsx:44`, page and overlay): add a primary action ("Clear search" which empties the field and refocuses it, and a "Shop all" link). Keep the query bound at 200 chars and rendered as text.
  - Empty checkout (`checkout-form.tsx:31-37`): `role=status` on the message.
  - Both en and th; axe clean; heading order unchanged.
- Files: `search-box.tsx`, `checkout-form.tsx`, `messages/*`, `tests/unit/components/`. Out of scope: any new search features.

### T5. Motion polish (CSS-only)

- Phase / IDs: P4, DESIGN §7, RULES §5.4 (task 23). Owner: frontend-builder. After T4. Agent-doable now, except item 4 (E2).
- Findings and work items:
  1. **Cart drawer has no slide.** The overlay fades (`cart-drawer.tsx:22`) but the panel (`:29`) appears instantly, while DESIGN §5.10 / §7 allow a drawer slide. Add `.drawer-panel-end` with `slide-in-end` / `slide-out-end` keyframes (opacity/transform only, `--dur-slow` in, `--dur-base` out) next to `globals.css:341`. The cart drawer is lazy, so no first-load cost.
  2. Look summary total change and the cart badge appearance: a <= 150 ms opacity fade on change only if it can be done without client code or layout shift (reserved box already exists, SPEC §9). Drop if it needs JS in the header island.
  3. Audit untouched tiles (`vibes-grid.tsx`, `look-teaser.tsx`, `editorial-teaser.tsx`; not read in this audit) for the same hover pattern as `category-tile.tsx:36,42` (scale <= 1.03, arrow 4 px, `motion-safe:`). Apply only where DESIGN §5.8 calls for an arrow.
  4. **Rule tension, not a defect to hide**: RULES §5.4 says animate only opacity and transform, but `button.tsx:17` uses `transition-colors` (DESIGN §5.1 "shift tone <= 8%") and the reduced-motion block (`globals.css:458`) deliberately allows colour. See E2.
- Acceptance: every new animation uses only opacity/transform; with `prefers-reduced-motion: reduce` the drawer does not slide (fade <= 100 ms). No new dependency. Shop app JS unchanged (`pnpm bundle:check`).
- Files: `src/styles/globals.css`, `src/components/cart/cart-drawer.tsx` (and tiles from item 3). Verification: e2e reduced-motion check (T6), screenshots/short capture, bundle check.

### T6. E2E and axe for the new states

- Phase / IDs: P4, RULES §8.8, §12.5. Owner: qa-a11y. Reviewer: reviewer (fresh agent). After T5.
- Acceptance:
  - `tests/e2e/states.spec.ts` (new): image blocked via `page.route` abort on a product image shows the placeholder with no layout shift; corrupt cart notice (extends journey 5); search no-results recovery; reduced-motion emulation (`page.emulateMedia({ reducedMotion: 'reduce' })`) asserts the cart drawer panel has no transform animation and durations <= 100 ms. en/th, mobile + desktop.
  - Axe on the new states (notice open, placeholder visible, empty search), zero critical/serious.
  - Keyboard pass on the notice, error boundary (component-level) and drawer; recorded in `docs/p4-validation.md`.
  - The route error boundary is covered by the T1 component test, not e2e (no throwing route may be added).
- Files: `tests/e2e/*`, `docs/p4-validation.md`. Verification: `pnpm test:e2e`, `pnpm test:a11y`, `pnpm test:coverage` (P3 lesson: coverage gate is not in `pnpm check`).

### T7. ASSETS.md accuracy and register test (task 24, agent part)

- Phase / IDs: P4, RULES §14, §15. Owner: content-editor (doc) + logic-builder (test). Reviewer: reviewer. Agent-doable now; independent of T1-T6.
- Current state from `docs/ASSETS.md`:
  - **Real photographs (Pexels License)**: 3 hero, 4 category tiles (rows `:97-103`), 9 product source photographs recoloured (`:61-69`). The licence covers copyright only; `:91` already says it is not a model/property release.
  - **AI-generated**: 76 product back/side angles (`:3-41`), disclosed in the gallery.
  - **Placeholders**: `src/app/icon.svg` (`:128`); brand mark and icons are original inline SVG.
  - **Stale rows**: `:129-140` still describe the 12 products' `{colour}-{1,2}.webp` as procedural placeholders "replace before marketing", but `:162` says photography supersedes them and `:45` calls the first rollout historical. Readers cannot tell what ships.
  - `docs/reference/home-mockup.jpg` is correctly marked not shipped.
- Acceptance:
  - Rewrite the register so each shipped file/group has exactly one current row (source, licence, author, date, AI yes/no, status `ship-ok` / `replace-before-marketing`); move superseded placeholder rows into a "Superseded" section.
  - Add a "Before public marketing" checklist: replace or clear the 76 AI angles; confirm acceptable use of recoloured stock photos of identifiable people (RULES §14.2); replace the favicon/brand mark if the owner wants a real identity; pick the repo licence.
  - Unit test `tests/unit/assets-register.test.ts`: every file under `public/images/**` is mentioned (by directory or path) in `docs/ASSETS.md`, and every AI-generated directory is flagged. Fails on an unlogged image.
- Out of scope: sourcing or generating new images; stating that anything is "rights-cleared" without owner evidence (see E3).

### T8. Docs and housekeeping (RULES §15.3)

- Owner: content-editor / planner (docs only). Agent-doable now.
- README fixes: `README.md:114` says P3 is "implemented on `feat/p3-seo-builders` (PR #8, stacked on #7)", but both merged; `:108` P2 wording is past tense of a branch state; no P4 status line; `:102` says "add a `LICENSE` file" and none exists (E5); links to `docs/p3-plan.md` / validation must still resolve; the commands list must match `package.json` (also `test:coverage`, `bundle:check`, `images:generate`).
- Mark `docs/p3-plan.md` header "Branch base" as historical; file a tracked issue for the flaky `mobile-nav.test.tsx` and reference it where it is mentioned (P3 T3 note). Do not skip or retry the test.
- SPEC §13a / §9: note the final behaviour of T1-T4 in the same PR as each (RULES §15.2); SPEC §2 still lists Framer Motion and `lucide-react`: correct to "CSS transitions; inline SVG icons" (they are not installed), a docs-only fix.

### T9. Deploy readiness and final Lighthouse report (task 25)

- Phase / IDs: P4, G2, PRD §8, SPEC §12. Owner: perf-engineer (run, report) + frontend-builder (case-study data). Reviewer: reviewer. **Blocked on the owner**: merge of T1-T8 to `main`, Production env var, and the domain decision (E1, E4).
- Preconditions (owner): `NEXT_PUBLIC_SITE_URL` set in Vercel Production (open since P3), Production deploy of `main` green, and the domain choice settled so the audit is on the final origin.
- Acceptance:
  - `LHCI_BASE_URL=<production origin> pnpm lhci` (no `HC_AUDIT_TARGET`, so SEO and `is-crawlable` are errors), 5 runs x 8 URLs, median. JSON stored as `docs/p4-deployed-audit.json` in the same shape as p3 (`auditDate`, Lighthouse version, per-URL medians); `docs/p4-validation.md` states pass/fail per assertion as measured, including the thin margins from P3 (`/en/shop` JS 39.9/40 KiB, `/th` performance 0.95, `/th/products/essential-tee` LCP 2462 ms). A miss is reported as a miss.
  - Production checks recorded: `/robots.txt` and `/sitemap.xml` use the production origin (no localhost), canonical and hreflang on a product page, `x-robots-tag` absent (indexable), security headers present, no console or hydration errors on Home/Product/Look.
  - Case study: `src/content/case-study.ts` gains `p4Raw` from `docs/p4-deployed-audit.json` (Zod-validated like the others); EN/TH copy states the latest numbers by reading the data, never typed in. Repo and live links updated if the domain changes. Screenshots refreshed in `docs/screenshots/p4/`.
  - Validators (Rich Results / schema.org for JSON-LD, an OG preview check, Search Console sitemap submit) are **owner-run** on Production; the agent supplies URLs and records results the owner reports, nothing more.
- Files: `docs/p4-deployed-audit.json`, `docs/p4-validation.md`, `src/content/case-study.ts`, `messages/*` (only if the case-study copy changes), `tests/unit` for the loader. Out of scope: DNS, Vercel settings, analytics.

### T10. Lighthouse-on-deploy workflow (E6, optional)

- Owner: perf-engineer. Reviewer: reviewer. **Blocked on owner approval** (edits CI, AGENT §9.5).
- `lighthouse-preview.yml` triggers on `deployment_status` and has never fired (Vercel creates no GitHub Deployments). Replace or supplement with `workflow_dispatch` taking a URL input (and optionally a post-merge run against Production), keep every assertion an error, keep `scripts/check-preview-headers.mjs`. No threshold is relaxed.

## Escalations / owner decisions

- **E1 Custom domain (DNS, Vercel domain settings)**: owner action. Recommend deciding before T9 so the final audit and canonical URLs use the final origin; set `NEXT_PUBLIC_SITE_URL` to it, update the case-study live link, and redeploy. If no domain is bought, ship P4 on `home-club-eight.vercel.app` and say so. Agents cannot buy or point a domain.
- **E2 RULES §5.4 vs colour hover** (`button.tsx:17`; reduced-motion block allows colour): recommend amending RULES §5.4 to "animate opacity, transform and colour (`color`, `background-color`, `border-color`) only", matching DESIGN §5.1; the alternative is rewriting hover to an opacity overlay. RULES is owner-level, so the agent does not edit it. T5 item 4 waits for the answer.
- **E3 Rights-cleared imagery (task 24 owner part)**: nothing in the repo proves rights beyond the Pexels License and the owner's approval of AI angles. Options: (a) keep stock plus AI with the disclosures and treat the site as a demo (current state, honest but "illustrative"); (b) owner supplies licensed or self-shot photographs and the 76 AI angles are replaced; (c) remove or relabel the AI angles. Recommend (a) for the public portfolio launch with the T7 checklist visible in the case study, and (b) only if the owner wants to use the imagery in marketing. Agents re-run `scripts/prepare-product-photography.mjs` and update `ASSETS.md` once files exist; they do not produce licences.
- **E4 Production env and merge**: owner sets `NEXT_PUBLIC_SITE_URL` in Production (still open from P3) and merges the P4 PR; T9 cannot start before that.
- **E5 Repository licence**: the repo is public and has no `LICENSE`. Owner picks (MIT recommended for a portfolio; code only, not images) or states "all rights reserved". Agents do not choose a licence. Also note text in the repo mentions licences only for fonts/assets.
- **E6 CI change for Lighthouse (T10)**: recommend `workflow_dispatch` plus manual runs recorded in `docs/p4-validation.md`, as in P3 E8. Needs owner approval.
- **E7 Owner reviews still open**: Thai copy for `seo.*`, `seo.og.alt.*`, `caseStudy.*`, plus the new `errorPage`, cart notice and search copy from T1/T2/T4; screen-reader smoke on the case study and menu (P3 E6); Rich Results / OG validators on Production.
- **E8 `global-error.tsx`**: engineering decision for the main agent in T1 (default: do not ship; document why). Escalate only if the owner wants a guaranteed branded last-resort page despite the bundle cost.

## Risks

- A client error boundary or image wrapper on a shared path can break the `/en/shop` 40 KiB app-JS gate; every code task runs `pnpm bundle:check` and the catalogue grid stays CSS-only.
- `error.tsx` sits under the locale layout, so errors thrown by the layout itself (fonts, provider) bypass it; that is the only case `global-error.tsx` would cover.
- Final numbers may regress (P3 margins are thin: 0.95 and 2462 ms); T9 reports reality, and a miss triggers a perf fix task rather than a relaxed threshold.
- Changing the domain after T9 invalidates canonical URLs and the audit; do E1 first.
- Reduced-motion verification is emulation only; no real device pass is claimed.
- Four code tasks edit `messages/*.json`; strict sequencing T1 -> T4 avoids key and parity conflicts (`tests/unit/i18n/parity.test.ts`).
- Unit coverage gate (75%) is not part of `pnpm check`; run `pnpm test:coverage` before each handoff (P3 lesson).

## Owner decisions (2026-11-01)

- **E1**: no custom domain. P4 ships on `https://home-club-eight.vercel.app`; the owner sets `NEXT_PUBLIC_SITE_URL` to it in Vercel Production (E4).
- **E2 accepted**: RULES §5.4 and DESIGN §7 amended to allow colour transitions (`color`, `background-color`, `border-color`) besides opacity and transform; layout properties stay banned. T5 item 4 is closed.
- **E3 option (a)**: keep the Pexels photographs and the AI angles with their disclosures; T7 rewrites `ASSETS.md` and adds the "before public marketing" checklist. No replacement imagery in P4.
- **E5**: MIT licence for the source code only (`LICENSE`); media stay governed by `docs/ASSETS.md`.
- **E6 approved**: T10 may replace the `deployment_status` trigger with `workflow_dispatch`; no threshold is relaxed.
- Flaky `mobile-nav` unit test tracked as issue #9.
- Pushing the branch / opening the PR was **not** approved yet; ask before pushing.

## Main-agent decisions (2026-11-01)

- **T1 budget**: the boundary first pushed `/en/shop` application JS to 41.0 (eager) and 40.3 KiB (lazy) of 40. Root cause of the tight margin was a
  second copy of the `next/link` runtime (3.3 KiB chunk) shipped to every route because `src/app/not-found.tsx` imported `next/link`.
  The root 404 now uses plain anchors (two justified `eslint-disable-next-line` comments): leaving the root not-found layout for `/en`
  or `/th` crosses root layouts, which is a full document load anyway, so behaviour is unchanged. Narrow exception to RULES 4.8, recorded here
  for the owner. Result: 3.2 KiB less application JS on every route (Shop 37.1 KiB with the lazy boundary). No budget changed.
- **T1 eager boundary**: with that headroom the error panel is imported eagerly. A lazily loaded panel would render nothing exactly when
  chunk loading fails (the most likely runtime error after a deploy).
- **E8**: `global-error.tsx` is not shipped (SPEC §13a).
