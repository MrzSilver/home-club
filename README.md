# Home Club Foundation — Demo Store

A bilingual (Thai / English) e-commerce storefront for a fictional "quiet essentials" apparel brand. Built as a **portfolio project** to showcase Next.js engineering, UX, performance and accessibility.

> **This is a demo.** No products are sold, no payments are taken, and no personal data is collected or stored.

## Highlights

- **Assemble your look** — pick a four-piece outfit, see live pricing and set discount, add it to the cart atomically.
- **TH / EN** with locale-aware URLs, and **THB / USD** pricing.
- **Fast and accessible** — Lighthouse ≥ 95 targets on mobile, WCAG 2.2 AA, keyboard-complete.
- **Typed everywhere** — strict TypeScript, Zod-validated data and state, unit + e2e + a11y tests.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · next-intl · Zustand · Zod · Vitest · Playwright + axe · Lighthouse CI · pnpm · Vercel

## Getting started

Requirements: Node.js (version in `.nvmrc`) and pnpm (version in `package.json` `packageManager`).

```bash
pnpm install
cp .env.example .env.local   # optional: every variable has a default
pnpm dev                     # http://localhost:3000
```

## Scripts

| Command                             | What it does                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Start the dev server                                                                          |
| `pnpm build` / `pnpm start`         | Production build / serve it                                                                   |
| `pnpm typecheck`                    | TypeScript, no emit                                                                           |
| `pnpm lint`                         | ESLint (includes accessibility rules)                                                         |
| `pnpm format` / `pnpm format:check` | Prettier                                                                                      |
| `pnpm test` / `pnpm test:watch`     | Unit and component tests (Vitest, files in `tests/unit`)                                      |
| `pnpm test:coverage`                | Unit tests with coverage thresholds (`src/lib` lines ≥ 90, global lines ≥ 75)                 |
| `pnpm test:e2e`                     | End-to-end journeys (Playwright, `tests/e2e`; builds and starts the production server itself) |
| `pnpm test:a11y`                    | Accessibility sweep (axe, tests tagged `@a11y`)                                               |
| `pnpm lhci`                         | Lighthouse CI against budgets (needs a prior `pnpm build`)                                    |
| `pnpm check`                        | typecheck + lint + test + build                                                               |

### Browsers for e2e and Lighthouse

- Playwright is pinned to `1.63.0` and uses Chromium only. Install the browser once with `pnpm exec playwright install chromium` (CI does this automatically). If `PLAYWRIGHT_BROWSERS_PATH` already points at a matching browser cache, nothing needs installing.
- Lighthouse CI finds Chrome through the `CHROME_PATH` environment variable, falling back to a system Chrome/Chromium. To reuse the Playwright Chromium:

  ```bash
  pnpm build
  CHROME_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome pnpm lhci
  ```

  Reports are written to `.lighthouseci/` (git-ignored).

- If `pnpm typecheck` complains about missing `.next/types` or `next-env.d.ts` (both are git-ignored and generated), run `pnpm exec next typegen`; CI does the same before typechecking.

## Project structure

```
src/app/[locale]/   routes (home, shop, collections, products, looks, vibes, journal, cart, checkout, case-study)
src/components/     ui · layout · home · catalogue · product · cart · look
src/lib/            pure business logic (money, pricing, stock, look, catalogue, search, seo)
src/data/           typed seed catalogue + Zod schema
src/store/          cart and preferences (Zustand)
messages/           en.json · th.json
docs/               reference mock-up, ADRs (docs/adr), ASSETS.md
tests/              unit · e2e
```

Full layout and rationale: [SPEC.md](./SPEC.md).

## Documentation

| Doc                      | Purpose                                                                     |
| ------------------------ | --------------------------------------------------------------------------- |
| [PRD.md](./PRD.md)       | Goals, scope, requirements (`FR-xxx`), success metrics                      |
| [SPEC.md](./SPEC.md)     | Architecture, data model, i18n, money, look builder, budgets, test strategy |
| [DESIGN.md](./DESIGN.md) | Tokens, typography, components, layout, motion, QA checklist                |
| [RULES.md](./RULES.md)   | Non-negotiable engineering rules and Definition of Done                     |
| [AGENT.md](./AGENT.md)   | How AI/human agents pick up, execute and hand off work                      |
| [CLAUDE.md](./CLAUDE.md) | Concise context file for Claude Code                                        |

If documents disagree, precedence is **RULES > PRD > SPEC > DESIGN > README**.

## Contributing

Short-lived branches, Conventional Commits with requirement IDs, small PRs, all checks green. See [RULES.md](./RULES.md) §13 and §16.

## Assets and licensing

Brand, products and copy are fictional. Imagery is placeholder/illustrative until replaced with rights-cleared assets; every asset is tracked in `docs/ASSETS.md`. Source code licence: to be decided by the owner (add a `LICENSE` file before publishing).

## Status

Phase P1 (MVP) — in progress. T01 (scaffold, tooling, CI, ADR-0001) is done; the app is still a placeholder page. See [PRD.md §6](./PRD.md) for the roadmap.

## Author

Silver (Peem) — [zzigma.com](https://zzigma.com)
