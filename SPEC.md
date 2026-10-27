# SPEC — Technical Specification

Implements [PRD.md](./PRD.md). Visual rules live in [DESIGN.md](./DESIGN.md). Hard constraints live in [RULES.md](./RULES.md). If documents conflict, precedence is: **RULES > PRD > SPEC > DESIGN > README**.

> Version numbers are intentionally not pinned here. Use the latest stable releases at scaffold time and pin them through the lockfile. Record the resolved versions in `docs/adr/0001-stack.md`.

---

## 1. Architecture overview

- **Rendering:** Next.js App Router. Server Components by default; Client Components only for interactivity (carousel, pickers, cart, look builder, filters UI).
- **Data:** Static, typed catalogue in `src/data/` validated by Zod at build/test time. No database, no API server.
- **State:** Cart and preferences on the client (Zustand + `localStorage`). Locale in the URL. Currency in a cookie (so the server can render the right prices) mirrored to the store.
- **Checkout:** Simulated. Pure functions + a success page. Stripe test mode is an optional later track behind a `PaymentProvider` interface.
- **Hosting:** Vercel. Static generation wherever possible (`generateStaticParams` for locales × slugs).

```
Browser ──► Next.js (RSC + static) ──► src/data (typed catalogue)
   │                                      ▲
   └─ Zustand (cart, look draft) ◄── lib/ (pricing, stock, look — pure functions)
```

## 2. Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | `src/` directory, TypeScript |
| Language | TypeScript (strict) | See RULES §2 |
| Styling | Tailwind CSS (v4) with CSS variables for tokens | Tokens in `src/styles/tokens.css` |
| i18n | `next-intl` | Locales `en`, `th`; prefix `always`; default `en` |
| State | Zustand + `persist` middleware | Versioned, schema-validated rehydration |
| Validation | Zod | Catalogue, cart rehydration, forms, env |
| Forms | React Hook Form + Zod resolver | Checkout, newsletter |
| Content | MDX (Journal) via a maintained MDX integration | Frontmatter validated by Zod |
| Motion | Framer Motion (`motion`) | Sparingly; reduced-motion aware |
| Icons | `lucide-react` (tree-shaken) or inline SVG | No icon fonts |
| Fonts | `next/font` (self-hosted) | See DESIGN §3 |
| Unit tests | Vitest + Testing Library | |
| E2E / a11y | Playwright + `@axe-core/playwright` | |
| Perf CI | Lighthouse CI with budgets | |
| Lint/format | ESLint (flat config, `next/core-web-vitals`, `jsx-a11y`, `import`) + Prettier | |
| Package manager | pnpm | `packageManager` field set, Node via `.nvmrc` |
| CI | GitHub Actions | typecheck → lint → unit → build → e2e/a11y → LHCI |

Dependency additions require justification (RULES §11).

## 3. Repository layout

```
home-club/
├─ README.md  PRD.md  SPEC.md  DESIGN.md  RULES.md  CLAUDE.md  AGENT.md
├─ docs/
│  ├─ reference/home-mockup.jpg
│  ├─ adr/                      # architecture decision records
│  └─ ASSETS.md                 # source + licence of every image
├─ public/
│  └─ images/{products,vibes,journal,brand}/
├─ messages/                    # i18n catalogues
│  ├─ en.json
│  └─ th.json
├─ src/
│  ├─ proxy.ts                  # next-intl locale routing + hidden currency rewrite (ADR-0003)
│  ├─ app/
│  │  ├─ layout.tsx             # pass-through root layout (html lives in [locale]/layout)
│  │  ├─ not-found.tsx          # bilingual server-rendered 404 for every unknown URL
│  │  └─ [locale]/
│  │     ├─ layout.tsx          # html lang, fonts, providers, skip link, Header, Footer
│  │     └─ [currency]/         # HIDDEN segment: usd | thb. Never in a public URL (ADR-0003)
│  │        ├─ layout.tsx       # validates the segment
│  │        ├─ page.tsx         # Home
│  │        ├─ shop/page.tsx       # All products
│  │        ├─ collections/[category]/page.tsx
│  │        ├─ products/[slug]/page.tsx
│  │        ├─ looks/page.tsx      # Look builder (index of looks)
│  │        ├─ looks/[slug]/page.tsx
│  │        ├─ vibes/page.tsx
│  │        ├─ vibes/[slug]/page.tsx
│  │        ├─ journal/page.tsx
│  │        ├─ journal/[slug]/page.tsx
│  │        ├─ search/page.tsx
│  │        ├─ cart/page.tsx
│  │        ├─ checkout/page.tsx
│  │        ├─ checkout/success/page.tsx
│  │        └─ case-study/page.tsx
│  ├─ components/
│  │  ├─ ui/                    # primitives: Button, Badge, Swatch, Dialog, Drawer…
│  │  ├─ layout/                # Header, Footer, MobileNav, LocaleSwitcher, CurrencySwitcher
│  │  ├─ home/                  # Hero, CategoryTiles, EssentialsGrid, LookTeaser, TrustStrip, VibesRow
│  │  ├─ catalogue/             # ProductCard, ProductGrid, Filters, SortSelect
│  │  ├─ product/               # Gallery, VariantPicker, AddToCart, SizeGuide
│  │  ├─ cart/                  # CartDrawer, CartLine, CartSummary
│  │  └─ look/                  # LookBuilder, LookSlot, LookSummary
│  ├─ data/
│  │  ├─ products.ts  looks.ts  vibes.ts  categories.ts
│  │  └─ schema.ts              # Zod schemas, shared types
│  ├─ lib/
│  │  ├─ money.ts               # cents math, FX, formatting
│  │  ├─ pricing.ts             # line totals, look discount
│  │  ├─ stock.ts               # availability checks
│  │  ├─ look.ts                # look-builder pure logic
│  │  ├─ catalogue.ts           # filter/sort/query helpers
│  │  ├─ search.ts
│  │  ├─ seo.ts                 # metadata + JSON-LD builders
│  │  ├─ locale-path.ts         # public <-> internal (currency segment) path helpers, hreflang paths
│  │  ├─ currency.ts            # cookie name, segment <-> currency, defaults
│  │  └─ env.ts                 # validated env
│  ├─ store/
│  │  ├─ cart.ts  preferences.ts
│  ├─ i18n/
│  │  ├─ routing.ts  request.ts  navigation.ts  params.ts  types.d.ts
│  ├─ styles/
│  │  ├─ globals.css  tokens.css
│  └─ content/journal/{en,th}/*.mdx
├─ tests/
│  ├─ unit/  (mirrors src/lib, src/store)
│  └─ e2e/
└─ .github/workflows/ci.yml
```

Rules: `lib/` has **no React and no browser APIs**. `data/` has no logic beyond schema and static data. Components never import from `app/`.

## 4. Routing and i18n

- Locales: `en` (default), `th`. `localePrefix: "always"`. Root `/` redirects to the preferred locale (cookie `NEXT_LOCALE` → `Accept-Language` → default).
- Use next-intl's routing helpers (`Link`, `redirect`, `usePathname`, `useRouter`) from `src/i18n/navigation.ts`; ESLint forbids `next/link` and the matching `next/navigation` exports. Never hand-concatenate locale prefixes. Paths passed to and returned from these helpers are **public** paths: `usePathname` is a wrapper that strips the hidden currency segment (`stripCurrencySegment` in `lib/locale-path.ts`), because next-intl's own hook reports `/usd/shop` during server rendering and `/shop` in the browser, a hydration mismatch. Import `next-intl/navigation` only from `src/i18n/navigation.ts` (ESLint).
- **Currency segment (ADR-0003).** Routes live under `src/app/[locale]/[currency]/…`, where `[currency]` is `usd` or `thb`. Visitors never see it. `src/proxy.ts` runs the next-intl middleware first (locale redirects), then **rewrites** the public URL to the internal one using the `hc_currency` cookie (default `en → usd`, `th → thb`): `/en/shop` is served from `/en/usd/shop`. A direct request for an internal path (`/en/usd/shop`) is redirected (308) to the public path and does not touch the cookie. Query strings are preserved. The proxy skips `/_next`, `/api`, `/images`, `/_vercel` and any path with a file extension (`icon.svg`, `robots.txt`, `sitemap.xml`, fonts).
- Every page is prerendered: `generateStaticParams` returns locale × currency (× slug). Route pages call `setRequestLocale(locale)` and validate their params with `src/i18n/params.ts` (`notFound()` for anything else).
- Every dynamic segment (`[locale]`, `[currency]`, `products/[slug]`, `collections/[category]`, …) exports `dynamicParams = false`, so an unlisted URL is never rendered on demand or written to the cache. Unknown URLs get the root `src/app/not-found.tsx`: server-rendered, status 404, `noindex`, English block (`lang="en"`) and Thai block (`lang="th"`) with links to `/en` and `/th`, no JavaScript needed. There is no catch-all route and no per-locale `not-found.tsx`.
- Switching currency = write the `hc_currency` cookie, then `router.refresh()` (T06). Switching locale = navigate to the same public path under the other locale.
- Route params and search params are asynchronous in current Next.js: `await` them in server components and metadata functions.
- Localised slugs are **not** used; slugs are English and shared across locales. Product names are localised via data.
- `generateStaticParams` returns locale × currency × slug for all products, categories, looks, vibes, articles.
- `generateMetadata` on every page: title template `%s · Home Club Foundation`, localized description, `metadataBase` from `NEXT_PUBLIC_SITE_URL`, `alternates.canonical` and `alternates.languages` (`en`, `th`, `x-default`) built from **public** paths (`lib/locale-path.ts`), Open Graph. Metadata never contains the currency segment.
- Message catalogues: `messages/{en,th}.json`, namespaced by feature (`nav`, `home`, `product`, `cart`, `look`, `checkout`, `common`, `a11y`, `seo`, `notFound`). Keys are typed from the `en` file (`AppConfig` augmentation in `src/i18n/types.d.ts`); `tests/unit/i18n/parity.test.ts` fails if key sets, empty strings or ICU placeholders differ, and runs in `pnpm test`.
- Client components get strings from props or a provider scoped with `messages={pick(...)}`; the locale layout's `NextIntlClientProvider` carries no messages so catalogues stay out of the client bundle.
- Text in another language than the page (the locale switcher's "ไทย" on an English page, the Latin wordmark on a Thai page) carries its own `lang` (`NativeLabel`, `Wordmark`) so the Thai typography rules apply (RULES 6.5).
- Plurals and numbers use ICU message syntax. No string concatenation for sentences.
- Product/look/vibe text lives in data as `{ en: string; th: string }`.

## 5. Data model

All schemas in `src/data/schema.ts` (Zod); TypeScript types are `z.infer`.

```ts
type Locale = "en" | "th";
type Localized = { en: string; th: string };

type Category = "foundations" | "performance" | "lifestyle" | "accessories";
type Vibe = "performance" | "outdoor" | "lazy" | "skate" | "hockey";
type Slot = "top" | "bottom" | "cap" | "socks";

type Color = {
  id: string;            // "sand", "black", "forest", "grey"
  name: Localized;
  hex: string;           // swatch only; never used for text contrast logic
};

type Variant = {
  sku: string;           // `${slug}-${colorId}-${size}`, unique
  colorId: string;
  size: string;          // "XS"…"XXL" | "ONE"
  stock: number;         // integer >= 0
};

type Product = {
  id: string;
  slug: string;          // kebab-case, unique
  category: Category;
  slot?: Slot;           // set if the product can fill a look slot
  vibes: Vibe[];
  name: Localized;
  description: Localized;
  priceCents: number;    // USD minor units, integer > 0
  colors: Color[];
  variants: Variant[];
  images: { colorId: string; src: string; alt: Localized; width: number; height: number }[];
  tags: string[];
  createdAt: string;     // ISO date, for "newest" sort
};

type Look = {
  id: string; slug: string;
  name: Localized; description: Localized;
  slots: Record<Slot, { defaultProductId: string; allowedProductIds: string[] }>;
  discountPct: number;   // 0–50, integer
};

type CartLine = {
  sku: string;
  qty: number;           // 1…min(stock, 10)
  lookId?: string;       // present when added via a look
};
```

Invariants (enforced by a test that runs against the seed data):
- Every `variant.colorId` exists in the product's `colors`; every `images.colorId` too.
- SKUs are globally unique; slugs unique per collection.
- A look's default/allowed products exist and each has `slot` equal to the slot key.
- At least one image per colour; all `alt` strings non-empty in both locales.

Seed catalogue: 12–16 products across 4 categories (see PRD §11). Initial set mirrors the mock-up: essential tee, premium hoodie, performance short, classic cap, socks.

## 6. Money and currency (`lib/money.ts`)

- **All money is integer minor units (cents).** No floats in business logic.
- Source of truth currency is USD. THB is derived: `thb = round(usdCents/100 * FX_USD_THB)` in whole baht. `FX_USD_THB` is a named constant with a comment stating it is a fixed demo value, not live data.
- Display only through `formatMoney(amount, currency, locale)` using `Intl.NumberFormat` (`currency` style). No manual symbols.
- Discount: `discountCents = round(subtotalCents * pct / 100)` using a single rounding rule (half away from zero), applied once on the set subtotal, never per line.
- Currency choice: cookie `hc_currency` (`USD|THB`), default by locale (`en→USD`, `th→THB`). The proxy reads it and selects the prerendered `[currency]` variant of the page (§4, ADR-0003), so prices are in the first HTML without any page becoming dynamic. Pages never read the cookie themselves; they receive the currency from the route segment. A currency change is a cookie write plus `router.refresh()`.

## 7. State

### 7.1 Cart (`store/cart.ts`)
- Zustand with `persist` to `localStorage` key `hc:cart:v1`.
- Rehydrate through a Zod schema; on failure, reset to empty (never throw).
- Actions: `add(sku, qty, lookId?)`, `setQty(sku, qty)`, `remove(sku)`, `clear()`, `addMany(lines)` (atomic).
- Every action clamps qty to `[1, min(stock, 10)]` using `lib/stock.ts`.
- **Hydration safety:** UI that depends on persisted state renders after mount (e.g. `useHydrated()` hook); the server HTML shows no count badge. No hydration warnings allowed.
- Selectors derive totals; totals are never stored.

### 7.2 Preferences (`store/preferences.ts`)
- Currency (mirrors cookie). Locale is **not** stored; the URL is the source of truth.

### 7.3 URL state
- Catalogue filters/sort and look selections live in the query string, parsed and validated with Zod on the server; invalid values fall back to defaults.

## 8. Look builder logic (`lib/look.ts`)

Pure, fully unit-tested.

```ts
type LookSelection = Record<Slot, { productId: string; colorId: string; size: string }>;

validateSelection(look, selection): { ok: true } | { ok: false; errors: SlotError[] }
priceLook(selection, discountPct): { subtotalCents; discountCents; totalCents }
toCartLines(selection, lookId): CartLine[]
findAlternatives(slot, selection, look): Variant[]   // in-stock options for a failing slot
```

Behaviour:
1. `validateSelection` checks product membership in `allowedProductIds`, variant existence, and stock ≥ 1 for each slot.
2. `addLook` is **atomic**: if validation fails nothing is added and the UI shows per-slot errors with alternatives.
3. Lines added through a look carry `lookId`; the cart shows the discount only while all four slots of that look are present. If one is removed, the discount is dropped and the UI says so.
4. Selection is serialisable to the query string: `?top=essential-tee.sand.M&bottom=…`.

## 9. Components (contracts)

| Component | Type | Key props / behaviour |
|---|---|---|
| `Header` | Server shell + client islands | Sticky; cart badge is a client island |
| `Hero` | Client | `slides[]`; arrows, dots, pause; no autoplay unless explicitly enabled; reduced-motion safe; first slide image is `priority` |
| `ProductCard` | Server | Link wraps whole card; swatches are decorative + `aria-label`; no nested interactive elements |
| `Filters` | Client | Writes to URL via router; debounced price slider; drawer on mobile |
| `Gallery` | Client | Keyboard + swipe; `sizes` tuned; only first image eager |
| `VariantPicker` | Client | Radio groups (`role="radiogroup"`), disabled combos have `aria-disabled` + reason text |
| `CartDrawer` | Client | Focus trap, `Esc` closes, returns focus to trigger, `aria-live` for updates |
| `LookBuilder` | Client | Four `LookSlot`s, `LookSummary`, atomic add |
| `LocaleSwitcher` / `CurrencySwitcher` | Client | Real links/buttons; announce change |

UI primitives wrap accessible patterns. Dialog/Drawer/Popover use Radix UI (`@radix-ui/react-dialog`, ADR-0005), loaded on demand (`next/dynamic`) so overlay code stays off the first-load path; never hand-roll focus management.

Shell as built (T06): `Header` is a server component inside the locale layout; its client islands are `HeaderSurface` (transparent over a hero, solid after; transparency comes from CSS `body:has([data-header-sentinel])` so the server HTML is already right, and the island only flags `data-past-hero` via an IntersectionObserver) and `MobileNav` (hamburger at every viewport size; the drawer holds the main links, `LocaleSwitcher` and `CurrencySwitcher`). `Footer` is a server component; the newsletter form is server HTML whose interactive island loads on first focus, press or submit. `LocaleSwitcher` and `CurrencySwitcher` live in the menu drawer; the currency switcher reads the current value from the route segment with `useParams`, so it needs no cookie read and no store.

## 10. SEO and structured data

- `app/sitemap.ts` emits every route × locale with `alternates`.
- `app/robots.ts`: allow all; disallow `/checkout` and `/cart`; mark demo clearly.
- JSON-LD: `Organization` (Home), `Product` + `Offer` (Product page; price in the active currency), `BreadcrumbList`, `Article` (Journal). Built in `lib/seo.ts`, rendered with a safe `<script type="application/ld+json">` helper (escape `<`).
- OG images generated via `opengraph-image` route per page type, localised.
- Because the brand is fictional, add `<meta name="robots">` policy per owner's decision (default: indexable; case-study page explains it is a demo).

## 11. Security

- Security headers via `next.config`: CSP (nonce or hashed; no `unsafe-eval`), `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`, `frame-ancestors 'none'`.
- No secrets in repo; `.env.example` only; `src/lib/env.ts` validates env with Zod at startup.
- Forms: validate on client and (when a server action exists) on server; never trust client prices — recompute from `data/` on every checkout step.
- No PII persistence in P1–P3. Newsletter and checkout forms do not transmit data off-device.
- Dependencies audited in CI (`pnpm audit` non-blocking report; Dependabot/Renovate on).

## 12. Performance

Budgets (enforced in Lighthouse CI and a bundle-size check):

| Metric | Budget |
|---|---|
| LCP (mobile, throttled) | < 2.5 s |
| INP | < 200 ms |
| CLS | < 0.1 |
| TBT (lab) | < 200 ms |
| First-load JS (gzip) per route | Home ≤ 175 kB · Collection ≤ 175 kB · Product ≤ 195 kB total, of which application code ≤ 40 / 40 / 60 kB (ADR-0004: the React 19 + Next 16 runtime alone is ~135 kB) |
| Hero image | ≤ 150 kB at delivered size (AVIF/WebP) |

Tactics:
- Server Components first; client islands small and lazy (`dynamic` for Look builder, Gallery zoom, Cart drawer content).
- `next/image` everywhere; explicit `width/height`; accurate `sizes`; only the LCP image has `priority`; blur placeholders generated at build.
- Fonts via `next/font` with `display: swap`, subset Latin and Thai, limit weights.
- No layout shift: reserve space for images, carousel, badges.
- Third-party scripts: none by default. Analytics (if added) must be deferred and consent-free (e.g. privacy-friendly) and measured against budgets.
- Cache: static generation + `Cache-Control` defaults from Vercel; immutable hashed assets.

## 13. Accessibility

- WCAG 2.2 AA. Contrast tokens pre-verified (DESIGN §2.3).
- Semantic landmarks, one `h1` per page, logical heading order.
- All interactive controls ≥ 44×44 px target on touch.
- Carousel: pause control, no autoplay by default, announcements via `aria-live="polite"` for slide changes only on user action.
- Forms: labels, `aria-describedby` for errors, error summary focus on submit failure.
- `prefers-reduced-motion`: disable parallax/auto transitions; keep fades ≤ 150 ms.
- Automated: axe in Playwright on every route × locale. Manual: keyboard pass + screen-reader smoke (VoiceOver/NVDA) before each phase exit.

## 13a. Error and empty states

Cart empty · Filters with zero results · Search with zero results · 404 · Image load failure (neutral placeholder with alt) · Out-of-stock variant · Look atomic-add failure · Corrupt persisted cart · Checkout validation errors. Each has copy in both locales and a primary recovery action.

## 14. Testing strategy

| Layer | Tool | What |
|---|---|---|
| Unit | Vitest | `money`, `pricing`, `stock`, `look`, `catalogue`, `search`, `seo` builders, cart store actions and rehydration, catalogue invariants (§5), i18n key parity |
| Component | Testing Library | `VariantPicker`, `CartDrawer`, `LookSlot`, `Filters` (behaviour, not snapshots) |
| E2E | Playwright | Critical journeys below on mobile + desktop, both locales |
| A11y | axe via Playwright | Every route × locale |
| Perf | Lighthouse CI | Home, Collection, Product, Look builder |
| Visual (optional) | Playwright screenshots | Home at 3 breakpoints vs. mock-up |

Critical journeys: (1) browse → filter → product → add to cart → change qty → checkout → confirmation; (2) assemble a look → add → discount shown → remove one item → discount removed; (3) switch locale and currency and confirm persistence; (4) out-of-stock look slot → atomic failure with alternatives; (5) corrupt `localStorage` → app recovers.

Coverage targets: `lib/` ≥ 90% lines; overall ≥ 75%. Tests assert behaviour and money/stock invariants rather than implementation details.

## 15. CI/CD

Workflow on PR and `main`:
1. Install (frozen lockfile) → 2. `typecheck` → 3. `lint` → 4. `test:unit` → 5. `build` → 6. `test:e2e` (+ axe) against the production build → 7. Lighthouse CI.

Vercel preview per PR; production from `main`. Required checks block merge.

## 16. Environment and scripts

`package.json` scripts (names are a contract; agents rely on them):

```
dev           next dev
build         next build
start         next start
typecheck     tsc --noEmit
lint          eslint .
format        prettier --write .
format:check  prettier --check .
test          vitest run
test:watch    vitest
test:e2e      playwright test
test:a11y     playwright test --grep @a11y
lhci          lhci autorun
check         pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

`.env.example` (all optional in P1–P3): `NEXT_PUBLIC_SITE_URL`. Later track adds Stripe/Supabase keys.

## 17. Implementation plan (task breakdown)

**P1 — MVP**
1. Scaffold, tooling, CI, ADR-0001. 2. Design tokens + fonts + base layout. 3. i18n routing + catalogues + parity check. 4. Data schema + seed + invariants test. 5. Money/currency lib + tests. 6. Header/Footer/switchers. 7. Home (hero, tiles, essentials, trust). 8. Collection with URL filters/sort. 9. Product page with variants + stock. 10. Cart store + drawer + `/cart`. 11. Lighthouse/axe baseline.

**P2 — Differentiators**
12. `lib/look.ts` + tests. 13. Look builder UI + atomic add + discount in cart. 14. Vibes. 15. Journal (MDX). 16. Search. 17. Checkout + confirmation (fake). 18. Size guide + "goes well with".

**P3 — Proof**
19. SEO: metadata, hreflang, sitemap, JSON-LD, OG. 20. Case-study page with measured results. 21. a11y manual pass + fixes. 22. E2E suite complete.

**P4 — Polish**
23. Motion, empty/error states. 24. Asset replacement (rights-cleared) + `ASSETS.md`. 25. Deploy, domain, final LHCI report.

Each task follows [AGENT.md](./AGENT.md) workflow and the Definition of Done in [RULES.md](./RULES.md).

## 18. Out of scope (technical)

Authentication, databases, payment capture, email sending, CMS UI, server-side inventory, analytics dashboards. Introducing any of these requires a PRD change and an ADR.
