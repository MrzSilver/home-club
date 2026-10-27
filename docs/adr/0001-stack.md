# ADR-0001: Stack, tooling and resolved versions

- Status: Accepted (task T01, SPEC §17 P1 item 1)
- Date: 2026-10-27
- Deciders: owner (stack chosen in SPEC §2); resolved versions recorded by the T01 builder

## Context

SPEC §2 fixes the stack (Next.js App Router, TypeScript strict, Tailwind v4, Zod, Vitest, Playwright + axe,
Lighthouse CI, pnpm) but intentionally leaves version numbers open: "use the latest stable releases at scaffold
time and pin them through the lockfile". RULES §11 requires a purpose and a licence check for every dependency,
and forbids `latest` ranges. RULES §14.4 requires fonts to be open-licensed and self-hosted, and this build
environment cannot reach Google Fonts.

## Decision

### Runtime and package manager

| Item    | Value                                                   | Notes                                            |
| ------- | ------------------------------------------------------- | ------------------------------------------------ |
| Node.js | 22 (`.nvmrc`; resolved locally: 22.23.4)                | Active LTS line; `engines.node >= 22`            |
| pnpm    | 10.28.0 (`packageManager`)                              | Corepack/`pnpm/action-setup` read the field      |
| Pinning | `.npmrc` `save-exact=true`; `pnpm-lock.yaml` is the pin | Every `package.json` version is exact, no ranges |

### Dependencies (resolved versions, identical to `package.json` and `pnpm-lock.yaml`)

Runtime dependencies (shipped to users):

| Package     | Version | Purpose                                                                              | Licence |
| ----------- | ------- | ------------------------------------------------------------------------------------ | ------- |
| `next`      | 16.4.3  | Framework (App Router, Turbopack build, `next/image`, `next/font`, security headers) | MIT     |
| `react`     | 19.3.1  | UI library required by Next.js                                                       | MIT     |
| `react-dom` | 19.3.1  | DOM renderer required by Next.js                                                     | MIT     |
| `zod`       | 4.6.7   | Boundary validation: env now; catalogue, cart rehydration, forms later (RULES §2.3)  | MIT     |

Development dependencies (never shipped):

| Package                     | Version | Purpose                                                                                                                                        | Licence                 |
| --------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `typescript`                | 6.0.3   | Type checking (`tsc --noEmit`); see "Version notes" for why not 7.x                                                                            | Apache-2.0              |
| `@types/node`               | 22.20.5 | Node typings, matched to the Node 22 line                                                                                                      | MIT                     |
| `@types/react`              | 19.3.0  | React typings                                                                                                                                  | MIT                     |
| `@types/react-dom`          | 19.3.0  | React DOM typings                                                                                                                              | MIT                     |
| `tailwindcss`               | 4.3.3   | Utility CSS (v4, CSS-first config, tokens in `src/styles/tokens.css`)                                                                          | MIT                     |
| `@tailwindcss/postcss`      | 4.3.3   | PostCSS integration used by Next.js                                                                                                            | MIT                     |
| `eslint`                    | 10.13.0 | Linter (flat config)                                                                                                                           | MIT                     |
| `eslint-config-next`        | 16.4.3  | `core-web-vitals` + `typescript` presets; bundles `typescript-eslint` 8.72.1, `eslint-plugin-react`, `react-hooks`, `@next/eslint-plugin-next` | MIT                     |
| `eslint-plugin-import`      | 2.32.0  | Import hygiene, `no-default-export`, `no-cycle` (also pulled in by the Next preset)                                                            | MIT                     |
| `eslint-plugin-jsx-a11y`    | 6.10.2  | Static accessibility rules, `strict` rule set (RULES §8)                                                                                       | MIT                     |
| `eslint-config-prettier`    | 10.1.8  | Disables ESLint rules that conflict with Prettier                                                                                              | MIT                     |
| `prettier`                  | 3.9.10  | Formatter (RULES §3.1)                                                                                                                         | MIT                     |
| `vitest`                    | 5.0.5   | Unit/component test runner                                                                                                                     | MIT                     |
| `@vitest/coverage-v8`       | 5.0.5   | Coverage with thresholds (RULES §12.3)                                                                                                         | MIT                     |
| `vite`                      | 8.3.5   | Required peer of `vitest` and `@vitejs/plugin-react`; resolves the `@/` alias                                                                  | MIT                     |
| `@vitejs/plugin-react`      | 6.1.2   | JSX transform for component tests                                                                                                              | MIT                     |
| `jsdom`                     | 30.1.3  | DOM environment for component tests                                                                                                            | MIT                     |
| `@testing-library/react`    | 16.3.3  | Component tests that assert behaviour                                                                                                          | MIT                     |
| `@testing-library/dom`      | 10.4.2  | Required peer of `@testing-library/react`                                                                                                      | MIT                     |
| `@testing-library/jest-dom` | 7.0.1   | Accessible-role and DOM matchers                                                                                                               | MIT                     |
| `@playwright/test`          | 1.63.0  | E2E runner, **pinned exactly** (matches the browser build preinstalled in CI/sandbox: chromium-1243)                                           | Apache-2.0              |
| `@axe-core/playwright`      | 4.14.0  | axe accessibility sweeps inside Playwright (RULES §8.8)                                                                                        | MPL-2.0 (flagged below) |
| `@lhci/cli`                 | 0.15.1  | Lighthouse CI budgets (SPEC §12)                                                                                                               | Apache-2.0              |

Deliberately **not** installed yet (later tasks add them with their own justification): `next-intl`, `zustand`,
`react-hook-form`, `motion`, `lucide-react`, Radix primitives, MDX tooling.

### Licence review (RULES §11.4)

`pnpm licenses list` over the full lockfile (about 630 packages) shows MIT, ISC, Apache-2.0, BSD-2/3-Clause,
0BSD, BlueOak-1.0.0, CC0-1.0, CC-BY-4.0 and MIT-0, plus the items below that are not in the owner's
"MIT/Apache-2.0/BSD/ISC" list and are therefore **flagged for owner acknowledgement**:

- `axe-core`, `@axe-core/playwright` (MPL-2.0): dev/test only; MPL is file-level copyleft and nothing is modified or redistributed.
- `lightningcss` and its platform binaries (MPL-2.0): build-time CSS transform used by Tailwind/Next; not shipped.
- `@img/sharp-libvips-*` (LGPL-3.0-or-later): prebuilt libvips binaries that Next.js uses for server-side image optimisation; dynamically loaded, not modified, not bundled into client code.
- `parse-cache-control` ("BSD", unspecified variant): transitive dev dependency of Lighthouse.
- `@csstools/*` (MIT-0): permissive public-domain-like; listed for completeness.

### Configuration decisions

- **Next.js 16 conventions:** `proxy.ts` replaces `middleware.ts`; `next lint` no longer exists, so `lint` is `eslint .`; `params` / `searchParams` are Promises.
- **TypeScript:** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`; `@/*` maps to `src/*`.
- **ESLint:** flat config on top of `eslint-config-next`; every warning from that preset is promoted to an error. Repository rules from RULES §2, §3 and §4 are enforced as lint rules (no `any`, no `!`, no `@ts-ignore`, `@ts-expect-error` needs a description, no `console.log`, default exports only for Next special files, no deep relative imports, `components/` cannot import `app/`, `src/lib` cannot import React/Next or touch `window`/`document`/`localStorage`, explicit return types on exported functions).
- **Lint layering** is checked twice: `import/no-restricted-paths` zones work on resolved paths (components -> app; lib -> app, components, store), and `no-restricted-imports` patterns add messages for the alias form. `src/lib` additionally bans React, Next.js, Node built-ins (`node:*`, `fs`, `http`, ...) and the globals `window`, `document`, `localStorage`, `sessionStorage`, `navigator`, `fetch`. `react/no-danger` is an error everywhere except the single allowed JSON-LD helper path `src/components/seo/json-ld.tsx` (RULES §10.3).
- **Tests:** unit tests live in `tests/unit`, e2e in `tests/e2e`. Coverage thresholds (`src/lib/**` lines 90, global lines 75) are enforced only by `pnpm test:coverage`, so `pnpm test` stays green on a young codebase.
- **CI** (`.github/workflows/ci.yml`): frozen install, non-blocking `pnpm audit`, `next typegen`, typecheck, lint, `format:check`, `test:coverage` (enforces the RULES §12.3 floors), build, Playwright e2e/axe against that build, Lighthouse CI; reports are uploaded as artifacts. Dependabot opens weekly npm and Actions updates.
- **Playwright** runs against the production build (`pnpm build && pnpm start` locally; `pnpm start` only when `CI` is set, because CI builds in an earlier step), with `mobile` (375x812, Pixel 5 emulation) and `desktop` (1280x800) projects, both Chromium. Browsers are never downloaded by project scripts; CI runs `playwright install --with-deps chromium` explicitly.
- **Lighthouse CI** runs mobile emulation with assertions from SPEC §12 (categories >= 0.95, LCP < 2500 ms, CLS < 0.1, TBT < 200 ms) judged on the median of 3 runs per URL, output to `.lighthouseci/`. Chrome is found through `CHROME_PATH`.
- **Security headers** (CSP, Referrer-Policy, X-Content-Type-Options, X-Frame-Options, Permissions-Policy) are built by `src/lib/security-headers.ts` and applied in `next.config.ts`. The CSP choice is tracked in ADR-0002.

### Fonts (implemented by T02)

Google Fonts is not reachable from the build environment, and RULES §9.5 / §14.4 require open-licensed,
self-hosted fonts. The fonts are the `@fontsource` npm packages, loaded through `next/font/local`
(`src/styles/fonts.ts`) so they are served from the site's own origin with `font-display: swap`.

| Role (DESIGN §3)  | Family         | Package (exact version)            | Files used (woff2, from `node_modules/@fontsource/*/files/`)       | Licence |
| ----------------- | -------------- | ---------------------------------- | ------------------------------------------------------------------ | ------- |
| Display, wordmark | Jost           | `@fontsource/jost` 5.3.0           | `jost-latin-{400,500,600}-normal.woff2` (about 9 to 10 kB each)    | OFL-1.1 |
| Body, UI          | Inter          | `@fontsource/inter` 5.3.0          | `inter-latin-{400,500,600}-normal.woff2` (about 23 to 24 kB each)  | OFL-1.1 |
| Thai (both roles) | Noto Sans Thai | `@fontsource/noto-sans-thai` 5.3.0 | `noto-sans-thai-thai-{400,500,600}-normal.woff2` (about 9 kB each) | OFL-1.1 |

All three are devDependencies: they are build inputs that `next build` copies (hashed) into `.next/static/media`,
so nothing from them is executed in the browser. Only the `latin` and `thai` subsets and three weights per family
are used (DESIGN §3: at most three weights). The `.woff` fallbacks and other subsets are never referenced.

- **unicode-range.** Each `@font-face` carries the range @fontsource publishes for its subset. A page only downloads
  Noto Sans Thai when it actually contains Thai characters (or the baht sign U+0E3F, which the Latin subsets lack),
  so English pages stay at Jost and Inter.
- **Stacks.** `next/font` exposes `--font-display`, `--font-body` and `--font-thai` on `<html>`. `tokens.css` builds the
  stacks from them: Latin family, then Noto Sans Thai, then `system-ui, sans-serif`; under `:lang(th)` Noto Sans Thai
  comes first. The `fallback` option of `next/font` is not used, because it would insert `system-ui` before Noto Sans
  Thai and let the OS answer for Thai glyphs.
- **Layout shift.** `adjustFontFallback: 'Arial'` makes `next/font` emit a size-adjusted local Arial in front of Jost and
  Inter. It is off for Noto Sans Thai: Arial has no Thai glyphs, so there is no meaningful Arial metric to match.
- **Preload.** Only Jost (3 files, about 30 kB) is preloaded. Inter and Noto Sans Thai are not.
  - The performance budget leaves little headroom (about 140 ms TBT median on an empty page; LCP is noisy on the
    2-CPU build machine). Measured on the temporary page, 2 sets of 3 Lighthouse CI runs per configuration:
    preloading all three families (about 100 kB) gave LCP 1.87 to 2.00 s in every run; Jost only gave 1.0 to 1.9 s
    (median-run 1.15 to 1.17 s in the T02 verification); no preload gave 1.0 to 1.9 s. TBT stayed 97 to 188 ms in all three.
  - With no preload at all, the only layout shift on the page was the Jost display headline swapping in
    (CLS 0.00067 in all six runs, the headline being the LCP element). Preloading Jost alone removed it (CLS 0 in
    all runs) with no change in TBT or LCP beyond run-to-run noise.
  - Inter text is small and its size-adjusted fallback is close, so it swaps in without a measurable shift.
  - Open point for T03 and later: `next/font` preloads whatever the layout imports, so the preload set cannot depend on
    the locale. Thai pages will swap system Thai to Noto Sans Thai without preload. Measure CLS on `/th`; if it shows,
    either preload Noto Sans Thai for both locales (about 27 kB) or split the layouts per locale.
- **Licence.** SIL Open Font License 1.1 permits embedding and redistribution with the site, provided the licence text
  travels with the fonts and the fonts are not sold on their own. Each package ships its `LICENSE` file; record the
  fonts in `docs/ASSETS.md` (RULES §14.1).

### Design scale (implemented by T02)

`src/styles/tokens.css` resets Tailwind's default colour, radius, shadow (also inset and drop shadow), blur,
breakpoint, container, text-size, tracking, leading, font-family, easing and animation scales, so only DESIGN tokens
produce utilities: `text-sm`, `leading-tight`, `tracking-wide`, `font-sans`, `ease-in-out`, `animate-spin`,
`max-w-sm`, `bg-white`, `rounded-xl` and `shadow-md` generate nothing. Type roles are the `.text-*` classes in
`globals.css`. Deliberately kept because they are open-ended or structural: spacing steps, z-index, opacity,
transition-duration, font-weight, the `ch`/fixed widths such as `max-w-prose`, and `transparent`/`current`.
`tests/unit/design-tokens.test.ts` compiles the stylesheet with Tailwind and asserts both lists.

### Version notes

- **TypeScript 6.0.3, not 7.0.2.** 7.x is the newest release, but `typescript-eslint` 8.72.1 (bundled by `eslint-config-next`) declares support for `>=4.8.4 <6.1.0`. 6.0.3 is the newest version the lint toolchain supports. Revisit when `typescript-eslint` adds 7.x.
- **ESLint 10.13.0, outside three plugins' declared peer ranges.** ESLint 9.x is marked "no longer supported" on npm, so the newest line was chosen. However, `eslint-plugin-import` 2.32.0 (`^9` upper bound), `eslint-plugin-jsx-a11y` 6.10.2 (`^9`) and `eslint-plugin-react` 7.37.5 (`^9.7`, bundled by `eslint-config-next`) all declare peers that ESLint 10 does not satisfy. `pnpm install --frozen-lockfile` stays silent about this because frozen installs skip peer resolution; `pnpm install --resolution-only` reports it. Also note that `create-next-app` 16.4.3 itself scaffolds `eslint: "^9"`. Every rule in this repository was exercised with deliberately broken fixtures on ESLint 10 and none crashed, and `eslint-config-next` wraps the react plugin with a compatibility shim. **Fallback:** if a plugin breaks on 10, pin `eslint` to 9.39.x (and revisit when the plugins publish ESLint 10 support).
- **`@playwright/test` 1.63.0** is exact because the sandbox/CI browser build must match the library revision. A newer 1.64.1 exists; upgrade deliberately together with the browser cache.
- **`@types/node` 22.x** instead of 26.x so the types match the Node 22 runtime.
- **pnpm build scripts:** pnpm 10 blocks dependency lifecycle scripts. The only blocked one is `unrs-resolver` (optional native resolver speed-up used by `eslint-import-resolver-typescript`); its prebuilt binary arrives through optional dependencies, so lint works without the script. It is listed in `pnpm-workspace.yaml` as `ignoredBuiltDependencies`.

## Consequences

- Exact pins plus Dependabot (weekly, npm and GitHub Actions) give reproducible installs and visible upgrades.
- Lint enforces most of RULES mechanically, so reviewers can focus on behaviour. Cost: contributors must satisfy a strict config (e.g. return types on exported functions, no default exports outside Next special files).
- Several dependencies sit one major behind or ahead of what their peers declare (ESLint 10, TypeScript 6). The version notes above say how to roll back.
- Three licence families outside the owner's allow-list (MPL-2.0 dev tools, LGPL libvips, one unspecified BSD) need owner acknowledgement; none is modified or shipped in client JS.
- Later tasks must append their dependencies and resolved versions to this ADR (or a superseding one).
