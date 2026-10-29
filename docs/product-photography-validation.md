# Product photographs and colour previews — 2026-10-29

## Gallery accessible-name correction (FR-030, RULES 8)

CI identified `label-content-name-mismatch` on the three gallery thumbnail buttons in both
locales and viewport sizes. The visible labels were Front/Back/Side (and Thai equivalents),
but `aria-label` overrode them with View image 1/2/3 and the label spans were hidden from
assistive technology. This was a real accessibility regression in the initial angle change.

Thumbnails with a view now use their visible text as the native accessible name. Images without
view metadata retain the localized numbered fallback. Unit and browser regression assertions
check the accessible name for every view in both languages. The product/cart journey now
selects the back thumbnail by its visible localized name. Accessibility rules remain unchanged.

The new unit assertions failed in both locales before the fix, then the targeted product/cart
and card suites passed all 22 tests. TypeScript, changed-file ESLint, formatting and the production
build passed. The fix is based on main after PR #4 was merged.

Full production E2E/accessibility rerun: **403 passed, 7 conditional skips, 0 failed** across
all 410 test cases (4.0 minutes), including all four previously failing bilingual mobile/desktop
product accessibility scans. Command: `node node_modules/@playwright/test/cli.js test --workers=2`.

## Back and side angles follow-up (FR-022, FR-030)

The owner approved AI-generated additional angles. There are now three views per colour for
all 12 products: 38 retained front photographs and 76 generated back/side images (114 total).
Cards explicitly select the back view for hover, independently of image array order. The
gallery labels all three views, synchronizes pressed thumbnail state with scrolling and resets
to the first view when colour changes. Thai/English copy and alt text disclose generated angles.
Updated image URL versions prevent cached detail crops appearing in place of new back views.

Validation of the final implementation:

- Production build passed, all 79 static pages; TypeScript and changed-file ESLint passed.
- Targeted unit suite: **90 passed** across cards, gallery/product/cart, data schema, catalogue
  image invariants and translation parity. Includes reordered-image and colour-reset coverage.
- Browser suite: **42 passed, 2 intentionally skipped** (hover-only tests on touch devices).
  Covers Thai/English, mobile/desktop, back-on-hover opacity, all three gallery positions,
  thumbnail labels/selection, colour changes and existing product/cart/accessibility journeys.
- Inspected every generated atlas and the exported back/side contact sheet, plus browser images.
- An initial browser run reached the old production server and was interrupted; the final run
  used the restarted current build. This was a stale-server issue, not a waived assertion.
- `git diff --check` passed. The full unit suite's previously recorded Windows issues below
  were not addressed or rerun as part of this angle-specific follow-up.
- Pre-push bundle checks passed: Home 165.7/175 KiB total, 33.7/40 KiB application gzip;
  collection/shop 171.2/175 KiB total, 39.2/40 KiB application; product 166.7/195 KiB total,
  34.7/60 KiB application. The collection application bundle is close to its limit.
- Repository-wide Prettier passes with `--end-of-line auto` on this Windows checkout. The
  unmodified default check reports CRLF differences throughout existing files; changed text
  files were formatted with the repository configuration, without reformatting unrelated files.
- Review screenshots for both locales and viewport sizes are committed in
  `docs/screenshots/product-angles/`.

Generation used the built-in ImageGen tool. The [prompt set](./product-angle-prompts.md),
[asset provenance](./ASSETS.md) and `scripts/prepare-product-angles.mjs` record the workflow.
Final generated assets are saved in `public/images/products/`, `*-2.webp` and `*-3.webp`.

## Historical initial photograph replacement

FR-012 / FR-022: all 12 products now have photographic colour previews (76 images).
Sources, photographers, processing and licence records are in [ASSETS.md](./ASSETS.md).
Colours are illustrative garment recolouring of real photographs, with no generated people.

Colour buttons sit outside the detail link, expose their pressed state and keep selection local
to each card. Both photographs change together without navigation. Product names/images remain
links. Prices/copy remain server-rendered; the preview island receives only slug, images and colours.
Images have an explicit version query allowed by a narrow local image pattern, avoiding stale
optimized placeholder images. Cards align photography to the top to keep model faces visible.

Validation on Windows:

- Production build passed, including all 79 static pages.
- TypeScript and ESLint for changed source/test/script files passed.
- Targeted unit tests: 62 passed (product cards, product/cart UI, asset invariants).
- Browser tests: 36 passed, both locales and mobile/desktop, including eight new card-colour
  scenarios plus existing gallery, product selection, cart, currency and accessibility journeys.
- Visually inspected source photos, a contact sheet of all 12 final product photographs and
  browser screenshots of selected colours.
- `git diff --check` passed.

Commands (use the repository's pinned package manager where available):

```sh
node node_modules/next/dist/bin/next build
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run tests/unit/components/product-card.test.tsx tests/unit/components/product-cart.test.tsx tests/unit/data/invariants.test.ts
node node_modules/@playwright/test/cli.js test tests/e2e/product-card-colors.spec.ts tests/e2e/product-cart.spec.ts --workers=2
```

The full unit run was also attempted: 812 passed and 19 failed. Eighteen failures concern
Windows path handling in the existing design-token loader/import-graph test helper; one concerned
the mobile menu's asynchronous opening timeout during the full concurrent run. Those files were
not changed. The complete unit suite is therefore not green. The production compiler/server
required execution outside the sandbox because SWC could not access its native cache inside it.

Original downloads and contact sheets are in the ignored `.asset-sources/` directory. The
photography preparation script writes through temporary files before replacement to avoid
intermittent Windows failures when opening existing WebP files for writing.
