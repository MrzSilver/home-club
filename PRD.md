# PRD — Home Club Foundation (Demo Store)

| | |
|---|---|
| Status | Draft v0.1 |
| Owner | Silver (Peem) — zzigma.com |
| Type | Portfolio showpiece (fictional brand, non-transactional) |
| Companion docs | [SPEC.md](./SPEC.md) · [DESIGN.md](./DESIGN.md) · [RULES.md](./RULES.md) · [AGENT.md](./AGENT.md) · [CLAUDE.md](./CLAUDE.md) |

---

## 1. Summary

Home Club Foundation is a fictional "quiet essentials" apparel brand. This project builds its online store as a **demo** whose purpose is to showcase the owner's front-end engineering, UX, performance and bilingual (TH/EN) skills to prospective clients on Upwork, Fastwork and the owner's own site.

Nothing is sold. No real payments, shipping, tax or customer data are handled.

## 2. Goals

| # | Goal | How we know |
|---|---|---|
| G1 | Look and feel like a real, premium DTC apparel store | Visual parity with `docs/reference/home-mockup.jpg` at 375 / 768 / 1280 px |
| G2 | Prove performance and SEO craft | Lighthouse (mobile) ≥ 95 in all four categories on Home, Collection, Product |
| G3 | Prove product-logic skill | "Assemble your look" builder works end-to-end with correct pricing and stock handling |
| G4 | Prove i18n skill | Full TH and EN, locale-aware URLs, currency (THB/USD) and metadata |
| G5 | Be explainable | A case-study page documents decisions, trade-offs and measured results |

## 3. Non-goals

- Real payments, orders, inventory, shipping, tax, returns, customer accounts.
- A custom admin/back-office or CMS UI.
- Marketplace features, multi-vendor, reviews moderation.
- Native apps.

## 4. Audience

| Persona | Need | What they look at |
|---|---|---|
| **Hiring client / agency lead** (primary) | Judge quality quickly, in under 2 minutes | First paint speed, polish, mobile UX, case-study page |
| **Technical reviewer / CTO** | Judge code quality | Repo structure, types, tests, CI, Lighthouse evidence |
| **Demo shopper** (secondary) | Browse and "buy" like on a real store | Browse → product → look builder → cart → fake checkout |

## 5. Assumptions

- Brand, products, prices and copy are fictional. Imagery is placeholder until rights-cleared assets exist (see RULES §14).
- Prices are authored in USD cents; THB is derived using a fixed demo exchange rate (SPEC §6).
- Default locale is `en`; Thai is a first-class locale, not an afterthought.
- Look-set discount is 10% (configurable). The mock-up's `$226` look total is inconsistent with its items (`$166`); the computed value wins.
- Hosting on Vercel free tier.

## 6. Scope and phasing

| Phase | Theme | Exit criteria |
|---|---|---|
| **P1 — MVP** | Foundation + browse + cart | Home, Collection, Product, Cart drawer, i18n, currency switch; Lighthouse ≥ 95 on those pages |
| **P2 — Differentiators** | Look builder + content | Look builder, Vibes, Journal, Search, fake Checkout |
| **P3 — Proof** | Case study + hardening | Case-study page, SEO (hreflang, sitemap, JSON-LD), a11y audit pass, e2e suite green |
| **P4 — Polish** | Delight + launch | Motion polish, empty/error states, deploy, custom domain, OG images |
| *Later (optional)* | Backend realism | Stripe test mode, Supabase for newsletter/orders |

## 7. Functional requirements

Priority: **M** = must (phase noted), **S** = should, **C** = could.
Every requirement has an ID; commits and tests reference IDs.

### 7.1 Global shell
| ID | Requirement | Pri |
|---|---|---|
| FR-001 | Header: hamburger (mobile nav), centered wordmark, search icon, cart icon with item-count badge | M-P1 |
| FR-002 | Locale switcher (TH/EN) and currency switcher (THB/USD) reachable from header/menu; choices persist across sessions | M-P1 |
| FR-003 | Footer with brand mark, short tagline, "Join the Club" newsletter form (demo only), legal placeholders | M-P1 |
| FR-004 | Skip-to-content link, visible focus states, landmark roles on every page | M-P1 |

### 7.2 Home
| ID | Requirement | Pri |
|---|---|---|
| FR-010 | Hero with headline, CTA, 3-slide carousel (autoplay off by default; pause/prev/next controls; respects reduced motion) | M-P1 |
| FR-011 | Four category tiles: Foundations, Performance, Lifestyle, Accessories → category pages | M-P1 |
| FR-012 | "Essentials" grid of 4 featured products with price and colour swatches | M-P1 |
| FR-013 | "Assemble your look" teaser showing a 4-piece set, summed price, CTA to the builder | M-P2 |
| FR-014 | Editorial "Tips" block linking to Journal | S-P2 |
| FR-015 | Trust strip: quality, responsible materials, fast delivery (copy is demo-neutral, not country-specific) | M-P1 |
| FR-016 | "Explore other vibes" row (Performance, Outdoor, Lazy, Skate, Hockey) → Vibes pages | M-P2 |

### 7.3 Catalogue
| ID | Requirement | Pri |
|---|---|---|
| FR-020 | Collection page per category and an "All" page, server-rendered | M-P1 |
| FR-021 | Filters: category, colour, size, price range; sort: featured, price asc/desc, newest. State lives in the URL query string | M-P1 |
| FR-022 | Product card: front photograph, hover crossfades to selected colour's back view, name, price (current currency); colour swatches update both previews without navigation; image/name open details; AI-generated demo angles allowed; quick-add disabled in P1 | M-P1 |
| FR-023 | Search: client-side over name, category, tags in the active locale; keyboard operable; results page and overlay | S-P2 |

### 7.4 Product detail
| ID | Requirement | Pri |
|---|---|---|
| FR-030 | Image gallery with front/back/side views for each colour, labelled thumbnails and active selection, swipe on mobile; AI-generated demo angles disclosed; zoom optional | M-P1 |
| FR-031 | Colour and size pickers; unavailable combos visibly disabled and announced to assistive tech | M-P1 |
| FR-032 | Per-variant stock (demo data); "low stock" label at ≤ 3 | M-P1 |
| FR-033 | Add to cart with quantity; opens cart drawer; disabled until a valid variant is chosen | M-P1 |
| FR-034 | Size guide (modal or section) in cm/in | S-P2 |
| FR-035 | "Goes well with" items (from look membership) | S-P2 |
| FR-036 | JSON-LD `Product` structured data | M-P3 |

### 7.5 Look builder
| ID | Requirement | Pri |
|---|---|---|
| FR-040 | Look = curated set of 4 slots (top, bottom, cap, socks); each slot has a default product | M-P2 |
| FR-041 | Per slot: choose colour and size; swap among allowed products | M-P2 |
| FR-042 | Live total in selected currency; show list total, set discount, and amount saved | M-P2 |
| FR-043 | "Add the look" adds all slots in one action. If any item is out of stock, nothing is added; the user is told which slot failed and shown valid alternatives | M-P2 |
| FR-044 | Look state is shareable via URL (slot → variant encoded in query) | C-P3 |

### 7.6 Cart and checkout (demo)
| ID | Requirement | Pri |
|---|---|---|
| FR-050 | Cart drawer and `/cart` page: change quantity (bounded by stock), remove, subtotal | M-P1 |
| FR-051 | Cart persists in localStorage, versioned and validated; survives reload; never breaks on stale/corrupt data | M-P1 |
| FR-052 | Items added through a look are grouped and show the look discount | M-P2 |
| FR-053 | Checkout form (contact, address, shipping choice, payment placeholder) with client + schema validation | M-P2 |
| FR-054 | Order confirmation page with fake order number and a clear "Demo — no payment taken" notice | M-P2 |
| FR-055 | A persistent but unobtrusive "Demo store" notice appears on checkout | M-P2 |

### 7.7 Content
| ID | Requirement | Pri |
|---|---|---|
| FR-060 | Vibes pages: curated product sets and lifestyle imagery per vibe | M-P2 |
| FR-061 | Journal: 3 MDX articles in both languages with reading time and related products | S-P2 |
| FR-062 | Case-study page: problem, constraints, stack choices, performance evidence, link to repo/live | M-P3 |

### 7.8 Internationalisation
| ID | Requirement | Pri |
|---|---|---|
| FR-070 | All UI strings from message catalogues (`th`, `en`); no hard-coded copy in components | M-P1 |
| FR-071 | Locale in the URL (`/en/...`, `/th/...`); `hreflang` alternates and localized metadata | M-P1 |
| FR-072 | Currency formatting via `Intl.NumberFormat` (THB, USD); price conversion is pure and tested | M-P1 |
| FR-073 | Thai typography verified (line height, no clipped ascenders, correct font fallback) | M-P1 |

## 8. Non-functional requirements

| Area | Requirement |
|---|---|
| **Performance** | Lighthouse mobile ≥ 95 (Performance, Accessibility, Best Practices, SEO) on Home, Collection, Product. LCP < 2.5 s, INP < 200 ms, CLS < 0.1 on throttled 4G mid-tier mobile. JS budget per route in SPEC §12 |
| **Accessibility** | WCAG 2.2 AA. Zero critical/serious axe violations on all routes. Full keyboard operation. Respect `prefers-reduced-motion` |
| **SEO** | Unique title/description per page and locale, canonical + hreflang, sitemap, robots, OG images, valid JSON-LD |
| **Compatibility** | Last 2 versions of Chrome, Safari (incl. iOS), Firefox, Edge. Viewports 360–1920 px |
| **Security & privacy** | No secrets in repo, strict CSP, no PII persisted, newsletter form is non-persisting in P1–P3 |
| **Maintainability** | TypeScript strict, ESLint clean, tests per RULES §12, ADRs for notable decisions |
| **Resilience** | Graceful states for empty cart, no results, 404, corrupt localStorage, image failure |

## 9. Success metrics (portfolio-oriented)

- Lighthouse report screenshots/links embedded in the case study.
- A reviewer can reach "added a look to cart" in ≤ 4 interactions.
- Repo passes CI (typecheck, lint, unit, e2e, a11y) on `main`.
- Zero hydration warnings in console on all routes.

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Placeholder/AI imagery has unclear rights | Legal/credibility | Track every asset in `docs/ASSETS.md`; replace with rights-cleared images before public launch |
| Hero/gallery images hurt LCP | Misses G2 | `next/image`, correct `sizes`, one `priority` image, AVIF/WebP, blur placeholders, budgets in CI |
| Scope creep (accounts, payments) | Never ships | Non-goals are binding; new scope needs a PRD change |
| i18n drift (strings missing in one locale) | Visible bugs | Typed message keys + CI check that `th` and `en` catalogues have identical keys |
| Cart hydration mismatch | Console errors, layout shift | Render cart count after mount; persisted store behind a hydration guard |

## 11. Open questions

1. Final look-set discount (default 10%).
2. Brand-name styling for TH copy (transliterate or keep Latin).
3. Whether Stripe test mode is added in the "Later" track.
4. Seed catalogue size (proposed 12–16 products across 4 categories).

## 12. Glossary

- **Look** — curated four-piece outfit sold as a set.
- **Vibe** — lifestyle collection (Performance, Outdoor, Lazy, Skate, Hockey) that cuts across categories.
- **Variant** — a product × colour × size combination with its own stock.
