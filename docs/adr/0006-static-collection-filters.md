# ADR-0006: Static collection pages with filters in a client island

- Status: Accepted by the builder of task T08 (SPEC §17 P1 item 8); to be acknowledged by the owner. It amends SPEC §7.3 (RULES §15.2), which is updated in the same change.
- Date: 2026-10-28
- Deciders: orchestrator brief for T08 (keep the pages static); builder for the details below
- Related: ADR-0002 (static rendering and CSP), ADR-0003 (currency segment, `priceCurrency` tag), ADR-0004 (JS budgets), ADR-0005 (Radix drawer, loaded on demand), SPEC §7.3, FR-020 to FR-022

## Context

SPEC §7.3 said catalogue filters and sort "live in the query string, parsed and validated with Zod on the
server". Reading `searchParams` in a page makes it dynamic, which ADR-0002 and ADR-0003 rule out: every
page is prerendered once per locale and currency, so prices are in the first HTML and the Lighthouse
budgets stay reachable. The catalogue has 12 products, so filtering them in the browser is cheap.

## Options considered

1. **Read `searchParams` on the server.** Correct HTML for every URL, but every collection request is
   rendered on demand. Rejected (ADR-0002).
2. **Prerender every filter combination** (`generateStaticParams` over colours x sizes x price ranges).
   The space is unbounded for price and large for the rest. Rejected.
3. **Static page, client island.** The server renders the default view (all products, featured order, prices in
   the visitor's currency); a small client island reads the query string in the browser, filters the list it was
   given with pure functions and writes changes back to the URL. Chosen.

## Decision

### Reading and writing the URL

- The island reads `location.search` with `useSyncExternalStore`. The server snapshot is the empty string, so the
  static HTML is the default view and hydration matches exactly; React then switches to the real URL before the
  first paint of the filtered state. `useSearchParams` was rejected: it needs a Suspense boundary and pushes the
  page up to that boundary out of the server HTML (the fallback is all the HTML would hold), or duplicates the grid.
- Navigations made by Next.js itself to the same collection page with another query (menu "Shop all" from
  `/shop?color=grey`, a category link from that category's filtered page) are committed with Next's own
  `pushState`, which its History API patch passes through without any event, and the static page segment is kept,
  so the island would keep showing the old filters (review r1, blocker). `CatalogueUrlWatcher` closes that gap: it
  calls `useSearchParams()`, the router's own committed-navigation signal, in an effect, and tells the store to
  re-read `location.search` (Next commits the URL before effects run). `useSearchParams` client-renders the
  component that calls it up to the nearest Suspense boundary, so the watcher renders nothing and sits in its
  own `<Suspense fallback={null}>`: the page stays static and the grid stays in the server HTML. Other options
  were a second patch over `history.pushState` (global monkey patching, and notifying from inside Next's
  insertion effect) or re-reading on every render (the island does not re-render for such a navigation).
  Covered by a unit test that fails without the watcher and by e2e tests for both repros in EN and TH, mobile
  and desktop.
- It writes with `window.history.replaceState` (Next.js integrates the native History API and keeps its router state
  in step) and dispatches one event so its own subscribers re-read. This replaces the `router.replace` named in the
  task text. Reason: for a static page `router.replace` navigates, which asks the server for the page again on every
  change (the same prerendered payload, one round trip per keystroke of a price) and only updates the URL when
  that returns. The History API call is synchronous and the list is already in the page. Measured on the built
  site: applying colour, size and price makes **0 network requests** (asserted in `tests/e2e/collection.spec.ts`).
- Replace, not push: filter changes add no history entries. Back leaves the collection; coming back from a
  product (or reloading, or opening a shared link) restores the filters from the URL.
- Each change is applied to the query as it is in the live URL at that moment, so a debounced price edit cannot
  undo a colour toggled meanwhile.
- Locale and currency switches already carry the query (T06 `LocaleLinks`; `priceCurrency` from T04-T05 round 2):
  after `router.refresh()` the island re-parses the URL with the new currency and the bounds convert.

### What the browser gets

- The server renders **every `ProductCard` itself** (the T07 component, not forked: server-formatted price,
  `defaultColorFor`, one link) and passes them as a `slug -> ReactNode` map. The island orders and filters the
  elements, so no Intl price formatting happens in the browser for cards (hydration-safe, ADR-0003 review notes).
- The island also gets `CatalogueItem[]`: slug, category, USD cents, `createdAt`, colours and the variants that
  have stock (10.4 kB of JSON for the whole seed, 1.2 kB gzip; a test caps it and another proves that filtering items gives
  exactly the slugs, in the same order, as filtering the full products for nine representative queries in both
  currencies). Descriptions, images and sold-out variants stay on the server.
- Strings: the page wraps the island in a `NextIntlClientProvider` carrying only the `catalogue` messages
  (SPEC §4); counts and the "Show N results" button are ICU plurals.

### Zod stays out of the browser

`lib/catalogue.ts` imports the whole seed and Zod, which the island must not ship (Zod alone would take a large
share of the 40 kB application budget). The query logic moved to `lib/catalogue-query.ts` (no seed data, no Zod; it
takes the known colour ids as an argument) and the category/size vocabularies to `data/taxonomy.ts` (re-exported by
`schema.ts`). `lib/catalogue.ts` keeps its public API as thin wrappers. This is the same trade the newsletter form
made in T06 (a plain check with a test that ties it to the Zod rule): every parse result is run through the Zod
`catalogueQuerySchema` in tests (typed `z.ZodType<CatalogueQuery>`, so the shapes cannot drift), and
`tests/unit/architecture/client-bundle.test.ts` walks the import graph of the island and the drawer and fails if
`zod`, the seed data, `lib/catalogue.ts` or `lib/pricing.ts` is reachable at run time.

### No layout shift on a filtered link

The HTML always holds the full default grid. A visitor who opens a filtered link would see that grid, then watch
it change when React takes over. Measured with Chromium, CPU 4x slower and scripts delayed 1.2 s so that the
first paint precedes hydration, on `/en/shop?color=black&size=M&minPrice=50&priceCurrency=usd`:

| Viewport  | CLS without the hold | CLS with the hold |
| --------- | -------------------- | ----------------- |
| 1280x800  | 0.231                | 0                 |
| 375x667   | 0.129                | 0.0013            |
| 1280x1080 | 0.280                | 0.00002           |

So an inline script (`query-hold.ts`, about 450 bytes, allowed by the ADR-0002 policy) runs while the HTML is
parsed. If the query string has a catalogue parameter (`category`, `color`, `size`, `minPrice`, `maxPrice`,
`priceCurrency`, or `sort` other than `featured`) it adds a `<style id="catalogue-hold">` that sets
`visibility: hidden` on everything that changes with the URL: the results area, the result count, the filter
chips and the "Filters (n)" button (the layout is kept, nothing moves, and the count never shows a wrong
"12 products" for a second). The island removes the element as soon as it has rendered the filtered result,
and a 4 s timer removes it anyway so a failed script bundle never hides the grid. Any other query string
(`utm_*`, `fbclid`, `gclid`, an empty one) holds nothing: those parameters sit on exactly the links people
share and change nothing, and holding for them made the largest paint wait for hydration (review r1: LCP 340-440 ms
for `/en/shop` against 1128-1296 ms for `/en/shop?utm_source=newsletter`, Chromium, CPU 4x). A unit test makes
the parser report every parameter it reads and compares that list with the script's, so a new filter cannot be
forgotten. The element is added to `<head>` rather than setting an attribute on a
React-managed element, so hydration never sees an unexpected attribute. Without JavaScript the grid is the full
default list and the filter controls do nothing (the links to every product and category still work).

### Layout

Filters are one `FilterPanel`: a sidebar from `lg` (14rem, always visible, 4-up grid from `xl`) and a Radix
dialog drawer below it. The drawer is loaded on first use through the same on-demand pattern as the menu
(ADR-0005), so the dialog code stays off the first-load path; the panel itself is in the main chunk because the
sidebar needs it. Price is two labelled text inputs (digits only, debounced 300 ms, Enter and blur apply at once),
not a slider: they work with every input method and cost no script. A range with min above max is not written to
the URL; the fields keep what was typed and say why.

## Consequences

- **Budgets (ADR-0004), measured on `pnpm start` with the orchestration `measure-js` tool (gzip level 9, every
  script response until the network is idle):** `/en/shop` and the category pages load 170.9 kB of JavaScript in
  total (budget 175) of which 32.1 kB is application code (budget 40). The Radix drawer is not part of that: it
  loads on first use, 13.5 kB gzip (two files).
- **Prefetch.** `PREFETCH.shop` and `PREFETCH.collections` are on, so Home's tile and "See all" links prefetch
  those pages after load, which downloads the collection island's chunk (about 12 kB gzip, fetched after the
  `load` event at low priority, not referenced by Home's HTML). Orchestrator decision (T08 round 2): "first-load
  JS" of a route is the set of scripts its HTML references (loaded before `load`); post-load prefetches of other
  routes do not count, and T11 implements the measurement that way. By the older network-until-idle tool `/en`
  reads 177.7 kB instead of 165.3 kB, which is that prefetch and not Home's own code. In 16 alternating Lighthouse
  runs per variant the prefetch showed no LCP penalty (median 2644 ms with it, 2915 ms without) and a TBT median
  32 ms higher (156 against 124 ms; the spread within a variant is 72 to 393 ms).
- **SEO.** Filtered URLs return the same static HTML as the unfiltered page, and the canonical and hreflang
  links point at the public path without a query, so they are not separate pages. A `noindex` for filtered
  states cannot be emitted by a static page; P3 (SEO) should decide whether `robots.txt` should disallow
  `/*?*` for the collection paths.
- **Price bounds in baht or dollars** follow ADR-0003: the URL carries a `priceCurrency` tag, and shared links,
  language switches and currency switches all convert (T04-T05 round 2, tested again through the island).
- **A much larger catalogue** (hundreds of products) would make shipping every card too heavy.
  At that point the filters should move to the server (dynamic or a route handler) or the list should be paged;
  revisit if the seed grows past a few dozen products.
- `router.refresh()` after a currency change re-renders the static page for the other currency, and the island
  keeps its URL state, so the filtered list survives the switch (e2e).
