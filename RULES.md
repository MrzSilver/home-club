# RULES — Engineering Rules (Non-Negotiable)

These rules apply to every contributor, human or agent. They are intentionally short and checkable. If a rule blocks you, **stop and raise it** (see [AGENT.md](./AGENT.md) §9); do not silently work around it.

Precedence when documents disagree: **RULES > PRD > SPEC > DESIGN > README**.

**Keywords:** MUST / MUST NOT are mandatory. SHOULD is the default unless you can justify otherwise in the PR.

---

## 1. Scope and truth

1. MUST implement only what [PRD.md](./PRD.md) requires. New scope needs a PRD change first.
2. MUST reference requirement IDs (e.g. `FR-043`) in PR descriptions and test names.
3. MUST NOT invent facts: no fake metrics, fake reviews, fake Lighthouse scores. Case-study numbers come from real runs and link to the report.
4. MUST keep the store clearly a demo: no real payment, no real PII collection, no claim of real products.

## 2. TypeScript

1. `strict` mode on, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
2. MUST NOT use `any`, `@ts-ignore`, or non-null `!` assertions. `@ts-expect-error` only with a comment explaining why and a linked issue.
3. MUST validate all untrusted input (localStorage, URL params, forms, MDX frontmatter, env) with Zod at the boundary; internal code then trusts the parsed types.
4. Prefer `type` unions and discriminated unions over enums. Exhaustive `switch` with a `never` check.
5. Exported functions have explicit return types. No default exports except where Next.js requires them (pages, layouts, route handlers).

## 3. Code style and structure

1. Formatting is Prettier's job; lint is ESLint's job. Do not hand-format or disable rules inline without justification.
2. File names `kebab-case`; components `PascalCase`; hooks `useThing`; constants `SCREAMING_SNAKE_CASE` only for true constants.
3. One component per file; components ≤ ~150 lines — split when larger.
4. MUST keep `src/lib/**` pure: no React, no `window`, no `document`, no I/O. Business logic (money, pricing, stock, look, catalogue) lives there and is unit-tested.
5. MUST NOT duplicate business rules in components; call `lib/`.
6. No dead code, no commented-out code, no `console.log` committed (`console.error/warn` only for real error paths).
7. Prefer composition and small hooks over deep prop drilling or large context providers.
8. Imports: absolute via `@/` alias; no deep relative chains (`../../..`). `components/` MUST NOT import from `app/`.
9. Comments explain **why**, not what. TODOs must reference an issue number.

## 4. Next.js and React

1. Server Components by default. Add `"use client"` only for interactivity, state, effects, or browser APIs, and keep client islands as small as possible.
2. MUST NOT fetch or compute catalogue data on the client when it can be done on the server.
3. `params` and `searchParams` are asynchronous in current Next.js — `await` them.
4. Every route MUST export `generateMetadata`; dynamic routes MUST export `generateStaticParams`.
5. No `useEffect` for derived state or data transforms; derive during render. No state mirrored from props.
6. Persisted client state MUST render only after hydration (`useHydrated`); zero hydration warnings.
7. Keys on lists are stable ids, never array indexes for reorderable data.
8. Use `next/link`/i18n `Link`, `next/image`, `next/font`. No raw `<a>` for internal navigation, no raw `<img>` for content imagery.

## 5. Styling

1. Tailwind with design tokens from [DESIGN.md](./DESIGN.md). MUST NOT use raw hex colours, arbitrary pixel values, or inline `style` for design values (dynamic swatch colours from data excepted).
2. No `!important`. No global CSS beyond `globals.css` and `tokens.css`.
3. Mobile-first: base styles are mobile; enhance with `sm:`/`md:`/`lg:`.
4. Respect `prefers-reduced-motion`; animate only `opacity` and `transform`.

## 6. Internationalisation

1. MUST NOT hard-code user-visible strings in components, including `aria-label`, `alt`, `title`, placeholders, and metadata.
2. Every new key is added to **both** `messages/en.json` and `messages/th.json` in the same change. CI enforces key parity.
3. MUST NOT concatenate translated fragments into sentences; use ICU placeholders and plural rules.
4. MUST format numbers, currency and dates with `Intl`/next-intl; never manual symbols or separators.
5. MUST NOT uppercase or letter-space Thai text. Apply Thai line-height via `:lang(th)`.
6. Thai copy is authored natively, not machine-translated word-for-word; flag uncertain TH copy for owner review.

## 7. Money, stock and correctness

1. MUST represent money as integer minor units. No floating-point arithmetic on prices.
2. MUST convert and round in exactly one place (`lib/money.ts`) with the documented rounding rule.
3. MUST recompute prices from `src/data` on every cart/checkout calculation; never trust stored totals.
4. Cart quantities MUST be clamped to available stock and a max of 10.
5. Adding a look to the cart MUST be atomic (all slots or none).
6. Catalogue invariants (SPEC §5) MUST be enforced by a test that runs on the seed data.

## 8. Accessibility (WCAG 2.2 AA)

1. Semantic HTML first; ARIA only to fill gaps. One `h1` per page; no skipped heading levels.
2. All functionality MUST work with keyboard only; visible focus on every interactive element.
3. Interactive targets ≥ 44×44 px on touch.
4. Images need meaningful `alt` (empty `alt=""` only for decorative images).
5. Colour MUST NOT be the sole indicator of state.
6. Dialogs/drawers: focus trap, `Esc` to close, focus returns to trigger, background inert. Use a vetted headless primitive rather than custom focus code.
7. Forms: visible labels, programmatic error association, focus moves to error summary on failure.
8. axe MUST report zero critical/serious violations on every route × locale in CI.

## 9. Performance

1. Budgets in SPEC §12 are release gates. A PR that breaks a budget MUST NOT merge.
2. MUST NOT add a client-side dependency > 10 kB gzip without an ADR and a measured justification.
3. Only the LCP image uses `priority`. All images have `width`/`height` and accurate `sizes`.
4. No layout shift: reserve space for async/late content.
5. No third-party scripts, fonts from CDNs, or tracking pixels without an ADR.
6. Heavy client features (Look builder, Gallery zoom) MUST be code-split.

## 10. Security and privacy

1. MUST NOT commit secrets, tokens, or `.env` files. Only `.env.example`.
2. Validate env with Zod at startup; fail fast.
3. MUST NOT use `dangerouslySetInnerHTML` except for escaped JSON-LD via the shared helper.
4. Ship security headers and a strict CSP (no `unsafe-eval`).
5. MUST NOT persist or transmit personal data in P1–P3. Demo forms stay on-device.
6. Treat all external content (MDX, URLs, localStorage) as untrusted.

## 11. Dependencies

1. Prefer platform and existing dependencies. Adding a dependency requires: purpose, size impact, maintenance status, licence compatibility, and why existing tools are insufficient — in the PR description.
2. MUST use the package manager and lockfile specified in SPEC §2; lockfile changes only via the package manager.
3. Pin through the lockfile; no `latest` ranges in `package.json`.
4. Licences must be permissive (MIT/Apache-2.0/BSD/ISC). Flag anything else.

## 12. Testing

1. Every change with logic ships with tests in the same PR. Bug fixes start with a failing test.
2. Test behaviour and invariants, not implementation details. No snapshot tests for logic.
3. `lib/` coverage ≥ 90%; overall ≥ 75%. Coverage is a floor, not a goal.
4. Tests MUST be deterministic: no real time, randomness, or network without control (fake timers, seeded data).
5. E2E covers the five critical journeys in SPEC §14, in both locales and on mobile + desktop viewports.
6. Never delete or weaken a test to make CI pass; fix the cause or escalate.
7. Test names state the behaviour (`"rejects add-look when a slot is out of stock (FR-043)"`).

## 13. Git and review

1. Trunk-based with short-lived branches: `feat/…`, `fix/…`, `chore/…`, `docs/…`.
2. Conventional Commits (`feat(cart): clamp qty to stock (FR-050)`). Subject ≤ 72 chars, imperative.
3. Small PRs (aim ≤ 400 changed lines excluding lockfile/assets), one concern each.
4. PR description: what, why, requirement IDs, screenshots (mobile + desktop, EN + TH for UI), test evidence, risks.
5. `main` is protected: required checks green, no force-push, squash merge.
6. MUST NOT commit generated build output, `node_modules`, large binaries (> 500 kB) outside `public/images`.

## 14. Assets and licensing

1. Every image/font/icon MUST be logged in `docs/ASSETS.md`: file, source, licence, author, date, whether AI-generated.
2. MUST NOT ship third-party brand logos, trademarks, or images of identifiable real people without a licence.
3. AI-generated or placeholder imagery MUST be marked as such in `ASSETS.md` and replaced or cleared before any public marketing use.
4. Fonts MUST be open-licensed and self-hosted.

## 15. Documentation

1. Decisions that change architecture, dependencies or budgets → ADR in `docs/adr/NNNN-title.md` (context, decision, consequences).
2. Behaviour changes MUST update the relevant doc (PRD/SPEC/DESIGN) in the same PR.
3. README stays accurate: commands, structure, and links must work.

## 16. Definition of Done

A task is done only when **all** are true:

- [ ] Satisfies the cited requirement IDs and their acceptance behaviour.
- [ ] `pnpm check` passes (typecheck, lint, unit tests, build).
- [ ] New/changed logic has tests; E2E/axe updated if a journey or page changed.
- [ ] UI verified at 375 and 1280 px in **EN and TH**, and in **THB and USD** where prices appear.
- [ ] Keyboard-only pass done; axe clean.
- [ ] Lighthouse/bundle budgets not regressed (for page-level changes).
- [ ] No new `any`, TODO without issue, console noise, or hydration warnings.
- [ ] Docs/ADR/ASSETS updated as needed.
- [ ] PR description complete with evidence.

## 17. Prohibited actions (hard stops)

- Disabling or weakening lint, type, test, CSP or a11y checks to get green.
- Committing secrets or personal data.
- Adding analytics/trackers, payment SDKs, or backend services without PRD + ADR.
- Rewriting history on `main`.
- Replacing the stack or major dependencies without an ADR.
- Hiding failures (swallowing errors, mocking away the thing under test).
- Fabricating results, metrics, or test outputs.
