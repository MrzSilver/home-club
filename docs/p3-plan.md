# P3 plan: Proof (SEO, case study, a11y pass, E2E)

Planner output (AGENT.md §3, §12). Scope is PRD §6 P3 and SPEC §17 tasks 19 to 22, plus optional FR-044.
Branch base: `codex/p2-look-builder` (PR #7, unmerged). Verified by reading the repo on this branch; nothing was run.

## Already in place (do not redo)

- **Per-page metadata**: all 13 content routes export `generateMetadata` with `alternates` built by
  `languageAlternates()` (`src/lib/locale-path.ts:89`): public canonical, `en`/`th`/`x-default`, never the currency segment.
  `metadataBase`, title template and site description are set in `src/app/[locale]/layout.tsx:32`.
- **Open Graph** (title, description, url, `og:locale` via `openGraphLocales()` in `src/lib/seo.ts:10`) exists only on Home, Shop,
  Collections and Product. Looks, Vibes, Journal and its articles have `alternates` but no `openGraph`.
- **noindex** already set on `cart`, `search`, `checkout`, `checkout/success` (`robots: { index: false }`); the 404 is noindex.
- **hreflang** is asserted in `tests/e2e/i18n.spec.ts:44` for `/th` only.
- **Lint scaffolding for JSON-LD**: `eslint.config.mjs:158-166` bans `dangerouslySetInnerHTML` except in
  `src/components/seo/json-ld.tsx`. That file and `src/components/seo/` do **not** exist yet.
- **CSP** (`src/lib/security-headers.ts:16`, ADR-0002): `script-src 'self' 'unsafe-inline'`, `img-src 'self' data: blob:`. An
  `application/ld+json` block is data, not executed, so no CSP change is needed. `next/og` images are same-origin, so no change either.
- **E2E infrastructure**: Playwright `mobile` (375) and `desktop` (1280) projects (`playwright.config.ts:18-28`), `@axe-core/playwright`,
  CI runs `pnpm test:e2e` (`.github/workflows/ci.yml:70`). Journey coverage today:

| SPEC §14 journey                                            | Covered by                                                                                                                            | Gap                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1 browse, filter, product, add, qty, checkout, confirmation | `product-cart.spec.ts:32` (product to cart, qty, remove), `collection.spec.ts`, `phase-two.spec.ts:34` (checkout, starts from a look) | No single end-to-end run                                         |
| 2 look, discount, remove, discount gone                     | `look.spec.ts:6` (en/th, both viewports)                                                                                              | None                                                             |
| 3 locale and currency persistence                           | `product-cart.spec.ts:101` (currency, reload), `i18n.spec.ts:267` (locale link keeps cookie)                                          | No combined journey; no locale + currency across a new page load |
| 4 out-of-stock slot, atomic failure                         | `look.spec.ts:44`                                                                                                                     | None                                                             |
| 5 corrupt `localStorage`                                    | `product-cart.spec.ts:192`                                                                                                            | Cart only; confirm look-line corruption is covered by unit tests |

- **axe**: `a11y.spec.ts:6` sweeps Home, Shop, two collections, Product, Cart, 404, filter states; `phase-two.spec.ts:80` covers
  looks, vibes, journal, search, checkout, success in en/th; `look.spec.ts` covers a look page. Not covered: other products and
  collections, `/looks/[slug]` for every look, `/vibes/[slug]` beyond `outdoor`, and any P3 page.
- **Lighthouse**: `lighthouserc.cjs` covers 8 routes (Home, Shop, Collection, Product, Look; en/th mix) with a Preview-aware mode.
  Real deployed numbers exist in `docs/p1-exit-audit.md`. `lighthouse-preview.yml` triggers on `deployment_status` and has never run.
- **Not present anywhere**: `src/app/sitemap.ts`, `src/app/robots.ts`, any `opengraph-image*`, any JSON-LD, the `case-study` route
  (only mentioned in `README.md:64` and SPEC), `twitter` card metadata, any link to a case study from the header or footer.
- **Finding in ADR-0003**: it says the proxy skips "OG images", but the matcher (`src/proxy.ts:89`) only skips `api|_next|_vercel|images` and
  paths with a dot. `opengraph-image` has no extension, so it would be locale-redirected and currency-rewritten (see Escalation E2).

## Task order

T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7 -> T8 (optional), strictly sequential.
T1 and T4 share `src/lib/seo.ts`; T2/T4/T5 all touch route `page.tsx` files. Each task has its own e2e spec file
(`seo-jsonld.spec.ts` in T2, `seo-sitemap.spec.ts` in T3, `seo-metadata.spec.ts` in T4), so no spec file is shared.

### T1. SEO builders (pure)

- Phase / IDs: P3, FR-036, FR-071, PRD §8 SEO. Owner: logic-builder. Reviewer: reviewer.
- Goal: pure, tested builders in `src/lib/seo.ts` for absolute URLs, JSON-LD (`Organization`, `Product`+`Offer`, `BreadcrumbList`,
  `Article`, optionally `WebSite`) and the sitemap entry list.
- Acceptance:
  - `Offer.price` is a decimal string from integer cents via `lib/money.ts` (no float maths); `priceCurrency` is `USD` or `THB` from the route; availability is `InStock`/`OutOfStock` from `lib/stock.ts`.
  - JSON-LD never contains the currency segment in any URL; all URLs are absolute from `NEXT_PUBLIC_SITE_URL`.
  - `sitemapEntries()` lists every indexable route x locale once (Home, Shop, 4 collections, products, looks, vibes, journal list + articles, case-study); excludes cart, checkout, success, search; each entry carries `en`/`th`/`x-default` alternates.
  - A serialiser escapes `<` (and U+2028/2029) so a string like `</script>` cannot break out (SPEC §10).
  - Unit tests cover the above, every seed product, and Thai text.
- Files: `src/lib/seo.ts`, `tests/unit/lib/seo.test.ts`.
- Out of scope: React, routes. Dependencies: none. Verification: unit, `pnpm check`.
- **Done (2026-10-31).** API: `absoluteUrl` in `lib/seo.ts`; `organizationJsonLd`, `webSiteJsonLd`,
  `productJsonLd`, `breadcrumbJsonLd`, `articleJsonLd`, `serializeJsonLd` in `lib/structured-data.ts`;
  `sitemapEntries(articles, siteUrl?)` in `lib/sitemap.ts`; `toDecimalString` in `lib/money.ts`.
  Notes for later tasks:
  - T2: journal frontmatter has no dates, so `Article` carries no `datePublished`. Adding dates is a
    content + frontmatter-schema change (content-editor and logic-builder), not invented in code.
  - T3: `sitemapEntries` takes the article list as a parameter (MDX on disk is I/O, not allowed in
    `lib/`); `src/app/sitemap.ts` builds it. The e2e test should request every sitemap URL and expect 200.
  - T6: add `'/case-study'` to `STATIC_ROUTES` in `lib/sitemap.ts` and update the sitemap unit test,
    which currently asserts the route is absent.

### T2. JSON-LD helper and wiring

- Phase / IDs: P3, FR-036. Owner: frontend-builder. Reviewer: reviewer.
- Goal: `src/components/seo/json-ld.tsx` (the single `dangerouslySetInnerHTML` site) and its use on pages.
- Acceptance:
  - Home emits `Organization`; Product emits `Product`+`Offer`+`BreadcrumbList`; collection pages and articles emit `BreadcrumbList`; articles emit `Article` (headline, dates, author, inLanguage).
  - Pages stay static (no `headers()`/cookies); `pnpm build` still lists SSG routes only.
  - No hydration warning; no CSP violation (existing smoke test pattern).
  - `seo-jsonld.spec.ts` parses every `ld+json` block on Home, a product (en/th, USD and THB cookie) and an article, and asserts type, `priceCurrency`, and no `/usd/` or `/thb/` in any URL.
  - Validated once with Google's Rich Results Test or schema.org validator; record the result in the PR, do not claim it otherwise.
- Files: `src/components/seo/json-ld.tsx`, product, home, collection and journal `page.tsx`, `tests/e2e/seo-jsonld.spec.ts` (new).
- Out of scope: reviews/ratings (RULES §1.3, no fabricated data). Dependencies: T1. Verification: unit, e2e, build.
- **Done (2026-10-31).** `src/components/seo/json-ld.tsx`. Home: `Organization` + `WebSite`; Product: `Product`+`Offer` +
  `BreadcrumbList` (Home > Shop > category > product, the collection pages' visible trail extended); Shop and collections:
  `BreadcrumbList` matching the visible breadcrumb; articles: `Article` (no dates) + `BreadcrumbList`. All routes still SSG.
  Open: the Rich Results / schema.org validator run has not been done yet; do it on the Vercel Preview and record it in the PR.

### T3. Sitemap and robots

- Phase / IDs: P3, SEO NFR. Owner: frontend-builder. Reviewer: reviewer.
- Goal: `src/app/sitemap.ts` and `src/app/robots.ts` per SPEC §10, using T1.
- Acceptance:
  - `/sitemap.xml` is 200, contains only public URLs (no `/usd/`, `/thb/`), each with `xhtml:link` alternates; count matches `sitemapEntries()`.
  - `/robots.txt` allows all, disallows `/en/cart`, `/th/cart`, `/en/checkout`, `/th/checkout`, `/en/search`, `/th/search` and links the sitemap. It has no rule for query URLs (see E3). (SPEC says `/checkout` and `/cart`, which do not exist unprefixed; see E3.)
  - Both paths bypass the proxy (they have a dot; assert this in e2e). Static, no dynamic APIs.
  - Output uses the production `NEXT_PUBLIC_SITE_URL`, never `localhost` in a Vercel Production build (see Risks).
- Files: `src/app/sitemap.ts`, `src/app/robots.ts`, `tests/e2e/seo-sitemap.spec.ts` (new). Dependencies: T1. Verification: build, e2e.
- **Done (2026-10-31).** Sitemap (60 URLs) and robots are static (○) and bypass the proxy. E5 guard in `lib/env.ts`:
  with `VERCEL_ENV=production` the build fails unless `NEXT_PUBLIC_SITE_URL` is a non-localhost https origin
  (checked both ways with a local production build). SPEC §10 robots wording and §11 env guard updated.
  Owner action: set `NEXT_PUBLIC_SITE_URL` in Vercel Production before the next production deploy.
  Follow-up: `tests/unit/components/mobile-nav.test.tsx` ("dialog" not found) failed once under full-suite load in
  two separate runs and passes alone; needs an issue and a root-cause look (RULES §12.4), not a retry.

### T4. Metadata completion and Open Graph (text)

- Phase / IDs: P3, FR-071, SEO NFR. Owner: frontend-builder. Sub-step A (before code): content-editor writes and approves the EN/TH strings. Reviewer: reviewer.
- Goal: every indexable page has title, description, canonical, hreflang, full `openGraph` (incl. `siteName`, `type`) and `twitter: summary_large_image`.
- Acceptance:
  - A shared metadata helper in `src/lib/seo.ts` (or a thin server helper) replaces the repeated per-page block; no copy-paste per page.
  - Looks, Vibes, Journal list and articles (`type: 'article'`) gain OG; titles and descriptions unique per page and locale (test asserts uniqueness across the sitemap list).
  - New strings in both `messages/en.json` and `messages/th.json`; TH flagged `needs-review`.
  - Filtered collection URLs (E3, ADR-0006 follow-up): no robots rule; `seo-metadata.spec.ts` asserts a filtered URL such as `/en/shop?color=black&sort=price-asc` still carries the clean canonical and hreflang alternates, with no query.
- Files: page `generateMetadata` blocks, `src/lib/seo.ts`, `messages/*`, `tests/e2e/seo-metadata.spec.ts` (new). Dependencies: T1. Verification: e2e, `pnpm check`.
- **Done (2026-10-31).** `pageMetadata` in `lib/seo.ts` (returns a local `PageMetadata` type, since `lib/` may not
  import Next; a test checks it is assignable to `Metadata`) now builds all 14 routes' metadata. 8 new `seo.*` keys
  (vibes, looks, journal); TH copy needs owner review. Noindex pages are `noindex, follow` (checkout used to be
  `nofollow`; it is also disallowed in robots.txt). `seo-metadata.spec.ts` sweeps every sitemap URL: full head
  tags, unique titles and descriptions, clean canonical on a filtered URL.

### T5. Open Graph images (`opengraph-image`)

- Phase / IDs: P3, SEO NFR (SPEC §10). Owner: frontend-builder. Reviewer: reviewer. Blocked by owner decision E2 and an ADR.
- Goal: localised 1200x630 images per page type (default/home, product, journal article), generated with Next's built-in `next/og` (no new dependency).
- Acceptance:
  - `og:image` URLs contain no currency segment and resolve with 200 and `image/png`; each is under 200 kB.
  - Thai renders correctly (no tofu) using the fontsource `.woff` already in `node_modules` (Satori cannot read `.woff2`); spike this first, 1 hour cap, and fall back to Latin wordmark plus product photo if it fails.
  - Product images use shipped AI product photos; no new third-party asset. `docs/ASSETS.md` updated for any new generated image or font file (RULES §14).
  - `docs/adr/0011-og-images.md` records route placement and the proxy matcher change; ADR-0003 text corrected.
  - Build time and route count recorded (output multiplies by locale x slug); proxy tests extended for the new path.
- Files: `src/app/[locale]/opengraph-image.tsx` (and product/journal variants), `src/proxy.ts`, `src/lib/locale-path.ts` tests, ADR. Dependencies: T4, E2. Verification: unit (proxy), e2e, build, manual check in an OG validator.
- **Done (2026-10-31), placement changed from E2 (accepted by the main agent, reported to the owner).** Next 16
  drops a parent `opengraph-image` once a page sets `openGraph`, so images are static route handlers named `*.png`
  under `/[locale]/og/` (home, 12 products, 3 articles; 32 PNGs, 42–53 kB). They end in `.png`, so the proxy
  matcher needed no change. Every indexable page names its image with `withOgImage` (`src/components/og`);
  T6 must do the same. Satori drops Thai tone marks after upper/lower vowels, so the card text is Latin in both
  locales; alt text and metadata stay Thai. No photos (Satori cannot decode WebP). ADR-0011; ADR-0003 corrected.
  Not done: a manual OG validator check (run on the Preview).
  Budget note: `/en/shop` application JS is 39.9/40 KiB (unchanged by T5, which is server-only), so T6/T7 must
  not add client code to catalogue pages.

### T6. Case-study page (FR-062)

- Phase / IDs: P3, FR-062, RULES §1.3. Owner: frontend-builder. Sub-steps: A perf-engineer collects the Lighthouse run; B content-editor writes the EN/TH copy from stored reports; C the page. Reviewer: reviewer.
- Goal: `/[locale]/case-study`: problem, constraints, stack choices, trade-offs, performance evidence, link to repo/live; states plainly that it is a demo.
- Acceptance:
  - Every number is copied from a stored report in the repo (`docs/p1-exit-audit.md`, `docs/p1-deployed-audit.json`, a fresh `docs/p3-lighthouse-*.json` from step A) and links to it; local-vs-deployed distinction explained (ADR-0004). No number without a source.
  - Step A (perf-engineer, before copy): run `LHCI_TARGET=preview LHCI_BASE_URL=<url> pnpm lhci` on the P3 branch, five runs, store the JSON; report failures as they are (the P1 audit already had one LCP miss; cite its fix status honestly).
  - Page is static, one `h1`, no skipped headings, EN and TH, `generateMetadata`, in the sitemap, linked from the footer (and nav if the owner wants).
  - Includes the asset disclosure (AI imagery, `docs/ASSETS.md`) and the "Demo, no payment" statement.
  - Added to the axe sweep (via T7's manifest). It is left out of `lighthouserc.cjs`: that file applies one set of assertions to every URL, so an informational entry would need a config change. The perf-engineer measures the case-study route separately in step A and the report is stored and cited like the others. Joining it to the gated routes with the same thresholds is the alternative if the owner prefers.
- Files: `src/app/[locale]/[currency]/case-study/page.tsx`, `src/components/content/`, `messages/*`, footer links, `docs/`. Dependencies: T4, owner inputs E4, E5. Verification: e2e, axe, build, screenshots 375/1280 en/th.
- Out of scope: new charts or libraries; use plain tables. Placeholders for repo/live URLs only with `TODO(#issue)`.
- **Done (2026-10-31).** Step A: `docs/p3-deployed-audit.json` and `docs/p3-validation.md` (Preview of a3a65a2; every
  error assertion passed). Steps B and C: `/[locale]/case-study`, server components only (`src/components/case-study`),
  numbers read and Zod-validated at build from the three `docs/p*-deployed-audit.json` files (`src/content/case-study.ts`,
  `@docs/*` tsconfig alias). The P1 LCP miss and its P2 fix are stated from the data. Footer link, sitemap entry,
  home OG card. Screenshots: `docs/screenshots/p3/`. All new TH copy needs owner review.

### T7. Accessibility pass and E2E completion

- Phase / IDs: P3, RULES §8.8, SPEC §14 (tasks 21, 22). Owner: qa-a11y. Reviewer: reviewer (fresh agent).
- Goal: axe over every route x locale from one shared manifest, and the five journeys as named tests.
- Acceptance:
  - `tests/e2e/routes.ts` generates the route list from seed data (all products, categories, looks, vibes, articles, case-study, 404); `a11y.spec.ts` consumes it. Both locales, zero critical/serious.
  - `tests/e2e/journeys.spec.ts`: journey 1 as one run (browse, filter, product, add, qty, checkout, confirmation); journey 3 as one run (switch locale and currency, reload and navigate, both persist). Journeys 2, 4, 5 are renamed or cross-referenced, not duplicated. Each runs in en/th on both projects.
  - Manual keyboard-only checklist run on case-study and each P3-touched page; results recorded in `docs/p3-validation.md`. Defects found are fixed in this task or filed as issues (no weakened checks).
  - The agent cannot do a screen-reader pass; the owner does it (E6).
- Files: `tests/e2e/*`, `docs/p3-validation.md`. Dependencies: T2 to T6. Verification: `pnpm test:e2e`, `pnpm test:a11y`.

### T8. Shareable look URL (FR-044, optional, C-P3)

- Phase / IDs: P3, FR-044. Owner: frontend-builder. Sub-step A (first): logic-builder writes the pure codec in `lib/look.ts` with tests. Reviewer: reviewer. Do only if the owner opts in (E7).
- Goal: selection encoded as `?top=essential-tee.sand.M&...` (SPEC §8.4).
- Acceptance:
  - Pure `encodeSelection`/`decodeSelection` in `lib/look.ts`; decoding is Zod-validated, ignores unknown products/colours/sizes per slot and falls back to defaults; round-trip and hostile-input tests.
  - Look pages stay static (ADR-0008, same pattern as ADR-0006: client reads `location.search`, writes with `replaceState`); a "Copy link" control with an `aria-live` confirmation; strings in en and th.
  - e2e: open a shared URL, see the same selection and total in both currencies.
  - Shared URLs canonicalise to the look path with no query.
- Files: `src/lib/look.ts`, `src/components/look/*`, `tests/unit`, `tests/e2e/look.spec.ts`, ADR-0008 amendment. Dependencies: none (independent), run last. Verification: unit, e2e, bundle check (look island budget).

## Escalations / owner decisions

Owner decisions, 2026-10-31: **E1 accepted** (Production indexable, Preview stays noindex) and
**E2 accepted** (generated `opengraph-image` routes at `[locale]` level, proxy matcher exclusion,
ADR-0011). E4 and E5 are still open and block T6 only. T1 has started.

Owner decisions, 2026-10-31 (later): **E4 accepted**: the case study links to the public repo
`https://github.com/MrzSilver/home-club` and the live site `https://home-club-eight.vercel.app`.
**E5 accepted**: the owner sets `NEXT_PUBLIC_SITE_URL=https://home-club-eight.vercel.app` in Vercel
Production (the T3 guard fails the build until then). Pushing the P3 branch and opening a draft PR, so
Vercel builds a Preview for the T6 Lighthouse run, is approved. **E7: FR-044 (T8) deferred** to the
backlog; P3 ends at T7.

- **E1 Indexing policy** (SPEC §10): recommend Production indexable, Preview stays noindex (already decided 2026-10-29, ADR-0004 amendment); case-study and footer say demo; no `noindex` meta on Production. Owner to confirm.
- **E2 OG images and the proxy** (new route files, ADR): SPEC §10 wants generated `opengraph-image` routes. Placing them under `[currency]` would leak `/en/usd/opengraph-image` into metadata (violates SPEC §4); placing them under `[locale]` needs the proxy matcher to skip them, which changes `src/proxy.ts` and ADR-0003. Recommend: `[locale]`-level routes, matcher exclusion, ADR-0011. Cheaper alternative if rejected: a few static images in `public/images/og/` referenced from metadata (needs `ASSETS.md` entries; weaker per-page localisation).
- **E3 Robots and filtered collection URLs** (ADR-0006 follow-up): recommend **no robots rule** for query URLs. The server renders the default view for any query and the canonical points at the clean path, so canonicalisation does the work; a `Disallow` would stop crawlers reading that canonical. T4 asserts the canonical on a filtered URL. Keep the locale-prefixed disallows for cart, checkout and search. Trade-off for the owner: those three pages also carry `noindex`, and a disallow means crawlers never read it; acceptable because nothing links to them for indexing, and the alternative (drop the disallow, rely on `noindex` alone) is also valid. Also confirm SPEC's `/checkout` and `/cart` wording means the locale-prefixed paths; fix SPEC §10 in the same PR (RULES §15.2).
- **E4 Repo and live URLs for the case study**: owner supplies the public GitHub URL and the production domain, or the case study ships with neutral wording and a tracked `TODO(#issue)`. Recommend waiting for real URLs.
- **E5 Production `NEXT_PUBLIC_SITE_URL`**: `src/lib/env.ts:3` defaults to `http://localhost:3000`. Recommend owner sets it in Vercel Production now, and T3 adds a build-time assertion in a Vercel production build (`VERCEL_ENV === 'production'`) so a sitemap with `localhost` cannot ship. The assertion touches `env.ts` (shared); keep it minimal.
- **E6 Screen-reader smoke for P3 pages** (case-study and any changed layout): owner-run, as before. Agents report keyboard and axe only.
- **E7 FR-044**: optional. Recommend deferring unless P3 finishes early; it adds client code to the budgeted look island.
- **E8 Lighthouse gate** (`lighthouse-preview.yml` never fires because Vercel creates no GitHub Deployments): recommend the case study and PR evidence use manual `LHCI_TARGET=preview` runs, and a separate small task (not in this plan) switches to a `pull_request` workflow that waits for the Vercel preview URL. Needs owner approval since it edits CI protections (AGENT §9.5).
- **E9 Dependencies**: none planned. `next/og` is part of Next; no schema.org or sitemap packages. Any request to add one needs a RULES §11 justification.

## Risks

- Thai in `ImageResponse` (font format, shaping) may fail; mitigated by the spike and Latin fallback in T5.
- Build time and output grow (OG images x locale x slug, sitemap); check against `pnpm bundle:check` and CI time.
- Sitemap or canonical built on `localhost` in production (E5).
- Case-study numbers drifting from reports: reviewer must trace each number to a file.
- Product JSON-LD in THB is a derived demo price (fixed FX, SPEC §6); the case study and structured data must not imply a real market price.
- Page count and shared files: T2/T3/T4/T5 all edit `page.tsx` files; sequence strictly to avoid merge conflicts (AGENT §4).
- PR #7 is unmerged; P3 branches should be cut after it merges, or stacked and rebased.
