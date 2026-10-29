# Fashion photography validation — 2026-10-28

Task: Replace Hero/category placeholders with warm, minimal fashion photography — FR-010, FR-011.

Status: Image replacement and browser checks complete; the repository-wide check remains failing.

Changed: Seven local WebP files, bilingual descriptions in `src/data/brand.ts` and
`src/data/categories.ts`, mobile Hero focal positions, and text scrims measured over the actual photos.
Product placeholders are retained by the owner's explicit choice. Category links keep decorative
`alt=""`; their title/subtitle supply the accessible name. Hero descriptions are localized.

Sources/licensing: [ASSETS.md](./ASSETS.md) records every photograph, photographer, source URL,
Pexels licence, date, non-AI status and processing. Platform licence verified; independent
model/property releases were not obtained or claimed. The photos illustrate styling, not actual
Home Club products or endorsements. No push or deployment was performed.

## Verification

- `pnpm check`: typecheck and lint pass. Unit tests: **811 passed, 18 failed**, across 54 files.
  The remaining failures are in `tests/unit/design-tokens.test.ts` (16) and
  `tests/unit/architecture/client-bundle.test.ts` (2). A clean HEAD archive reproduced those
  failures before these changes; Windows path separators are visible in the import-graph failures.
  The initial full run also had a mobile-nav timeout; it passed independently and in the final run.
  No checks were disabled or weakened. Build is not reached by `check` after unit failures.
- `pnpm build` separately: **passed**, 79 static pages generated after the scrim fixes.
- Focused data/i18n/category component tests: **93 passed**.
- Playwright `home.spec.ts`, `home-contrast.spec.ts`, `a11y.spec.ts`, `photography.spec.ts`:
  **112 passed** on the final production UI, using a temporary localhost:3100 override because
  port 3000 was already occupied. Coverage includes 375/1280 CSS px, Thai/English,
  keyboard controls, every slide, axe, pixel-based contrast of at least 4.5:1, and image loading.
- Photography screenshots cover both locales and both USD/THB currencies, every Hero slide and
  each category. The eight photography cases were rerun after refining screenshot capture to
  disable animations and reset the category scroller before the full-page capture.
  Artifacts: `test-results/fashion/photography-*/{home,hero-*,category-*}.png` (ignored local output).
- `node scripts/generate-placeholders.mjs`: **0 written, 83 unchanged**. The generator preserves
  existing Hero/category photographs; all 76 product placeholder files remain unchanged.
- Prettier checks on the changed files and `git diff --check`: passed.

## Performance measurements

Local Lighthouse mobile smoke run: one run each on `/en` and `/th`, production server on
localhost:3101, reports under `.lighthouseci/` (local filesystem only). This is not the configured
five-run median release gate and there is no before/after Lighthouse comparison.

| Locale | Performance | Accessibility | Best practices | SEO | LCP     | CLS |
| ------ | ----------- | ------------- | -------------- | --- | ------- | --- |
| EN     | 92          | 100           | 100            | 100 | 3.294 s | 0   |
| TH     | 91          | 100           | 100            | 100 | 3.386 s | 0   |

Lighthouse's local assertions completed with warnings for performance below 95 and LCP above
2.5 s; those targets are **not claimed as passed**. Hero source files are 42,330 / 28,392 / 69,006
bytes, all below the 150 kB image budget. Runtime images remain self-hosted through `next/image`.

Follow-ups: Resolve the existing Windows-sensitive unit failures and measure the full performance
gate in a controlled environment before release. Review the Thai descriptions and any future
public marketing use against the recorded licensing limits.
