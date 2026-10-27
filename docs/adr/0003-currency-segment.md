# ADR-0003: Cookie-driven currency on statically generated pages (hidden `[currency]` route segment)

- Status: Accepted (owner decision 8, 2026-10-27; implemented by task T03)
- Date: 2026-10-27
- Deciders: owner
- Related: ADR-0002 (static rendering and CSP), SPEC §4 and §6, RULES §4, §9

## Context

SPEC §6 wants prices in the visitor's currency in the first HTML, chosen by the `hc_currency` cookie
(`USD|THB`, default `en -> USD`, `th -> THB`). Reading a cookie inside a page or layout (`cookies()`) makes that route
dynamic, so every page would be rendered per request. ADR-0002 rejected that: all routes stay static so the
Lighthouse budgets (LCP, TBT) and CDN caching stay reachable.

Rendering prices on the client after hydration would keep the pages static but puts a placeholder (or a wrong
currency) in the server HTML, creates a flash and a hydration-mismatch risk, and leaves crawlers with no prices.

## Options considered

1. **Read the cookie in the page.** Correct HTML, but dynamic rendering for every route. Rejected (ADR-0002).
2. **Format on the client.** Static, but no prices in the HTML, layout shift, hydration mismatches. Rejected (RULES §4.2, §9.4).
3. **Currency in the public URL** (`/en/usd/shop`). Static and simple, but two URLs per page and locale, duplicate
   content and hreflang noise, and a shared link would pin the recipient's currency. Rejected.
4. **Hidden route segment, selected by the proxy.** The currency is part of the _internal_ route, `src/app/[locale]/[currency]/…`,
   which is prerendered once per currency. `src/proxy.ts` picks the variant from the cookie by rewriting the URL. Chosen.

## Decision

- Routes live under `src/app/[locale]/[currency]/…`. `generateStaticParams` returns locale x currency (x slug); the
  `[currency]` layout and `src/i18n/params.ts` validate the segment (`usd|thb`, anything else is a 404).
- `src/proxy.ts` (Next.js 16 `proxy`):
  1. Runs the next-intl middleware first. If it redirects (prefix-less path, `/`, locale detection), that response is returned.
  2. A request whose path is already internal (`/{locale}/{usd|thb}[/…]`) is redirected with **308** to the public path,
     query string kept. **The cookie is not changed by this redirect:** a GET redirect should not write state, and the
     internal segment is not a URL anyone is meant to share. The visitor then gets the variant their cookie selects.
  3. Otherwise it reads `hc_currency` through `resolveCurrency()` (`src/lib/currency.ts`; invalid or missing values fall back
     to the locale default) and **rewrites** `/{locale}/rest` to `/{locale}/{usd|thb}/rest`, preserving the query string and
     keeping the headers and cookies next-intl set (the locale request header, `NEXT_LOCALE`).
  4. The matcher skips `/_next`, `/_vercel`, `/api`, `/images` and any path with a file extension (`icon.svg`,
     `favicon.ico`, `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, fonts, OG images).
- Path logic (detect, strip, add the segment, hreflang paths) is pure and lives in `src/lib/locale-path.ts`.
- Public URLs, canonical links, `alternates.languages` and the sitemap never contain the segment.
- Switching currency (T06) = write `hc_currency` (path `/`, one year, `SameSite=Lax`), then `router.refresh()`.
  The Zustand preference mirrors the cookie (SPEC §7.2).

## Consequences

- **Every page stays static**; `pnpm build` lists `●` (SSG) routes only, and with `dynamicParams = false` nothing else is rendered on demand. Output multiplies by two currencies for every
  locale x slug (build time and size roughly double for catalogue pages).
- **Router cache and prefetch.** Client-side `<Link>` prefetches go through the proxy, so they receive the variant for the
  current cookie. The client router cache is keyed by the public URL, not by currency. `router.refresh()` clears the
  cache entry _for the current route only_ (Next.js docs, `useRouter`), so pages prefetched or visited earlier can show the
  old currency until their stale time (static pages: 5 minutes) passes. T06 must verify this with an e2e test (switch
  currency, then follow a link that was already prefetched) and, if it fails, fall back to a full reload or to
  `experimental.staleTimes`. Not yet exercised: there is no switcher or second route in T03.
- **Shared links.** Public URLs carry no currency, so a link shows the _recipient's_ currency. Catalogue filters that hold
  price bounds carry their own `priceCurrency` tag for this reason (T04-T05 round 2).
- **Crawlers and first visits** have no cookie, so they see `en -> USD` and `th -> THB`, matching the locale defaults,
  hreflang and (later) JSON-LD `priceCurrency`.
- **HTTP caching.** The same public URL returns different HTML depending on a cookie. On Vercel the proxy runs _before_ the
  CDN cache, so it chooses the prerendered object and nothing needs to vary. Behind a CDN that sits in front of
  `next start` the cache must bypass or key on `hc_currency` (Next.js docs: "proxy.js should run before the CDN cache").
  The proxy does not add `Vary: Cookie`, because on Vercel that would fragment the cache of an object that is already
  per-currency.
- **`dynamicParams = false` everywhere.** Every dynamic segment (`[locale]`, `[currency]`, and later `products/[slug]`,
  `collections/[category]`, looks, vibes, journal) MUST export `dynamicParams = false`. With the default (`true`), Next.js
  renders any unlisted URL on demand, writes it to the route cache and serves it with `s-maxage=31536000`: 100 junk
  URLs added about 700 cache files (about 4.8 MB) in the review. With `false`, an unknown URL is a 404 that is never
  cached (`Cache-Control: private, no-cache, no-store`). T08/T09 must do the same for unknown slugs.
- **404 behaviour.** There is no catch-all route and no per-locale `not-found.tsx`. A URL that no prerendered page answers
  gets `src/app/not-found.tsx`, the prebuilt `/_not-found` page: server-rendered, status 404, `noindex`, with an
  English block (`lang="en"`, the one `h1`) and a Thai block (`lang="th"`), links to `/en` and `/th`, styles and fonts,
  and a title that is not the home title. It works without JavaScript (e2e tests run with JS off). The cost is that a
  404 is not in the visitor's locale automatically; both languages are shown instead. Findings from the review: a
  `[...rest]` catch-all or a locale `not-found.tsx` produced Next.js's empty `__next_error__` shell in the server HTML
  (no `lang`, no body, home title) in 16.4, and only `dynamicParams = false` makes it serve the prebuilt page. A page
  that calls `notFound()` for an unknown slug at request time would still yield that shell, which is another reason
  slugs must be prerendered with `dynamicParams = false`. `global-not-found` is still experimental and was not needed.
- **`usePathname` and hydration.** On a prerendered page that went through the rewrite, next-intl's `usePathname()`
  returns the internal path while rendering on the server (`/usd/shop`) and the public one in the browser (`/shop`),
  so anything that renders it mismatches on hydration (Next.js docs, `usePathname`). `@/i18n/navigation` therefore
  exports its own `usePathname`, which strips the currency segment through the pure `stripCurrencySegment()` in
  `src/lib/locale-path.ts`; ESLint forbids importing `next-intl/navigation` anywhere else. Server HTML and client then
  agree. `LocaleLinks` (a client island on the temporary home page) is the first consumer, covered by unit and e2e
  tests that assert public hrefs in the server HTML and no console errors after hydration. `useRouter().push/replace`
  take and build public paths, so they need no wrapper.
- **The segment is an implementation detail.** Nothing outside `src/proxy.ts`, `src/lib/locale-path.ts`,
  `src/lib/currency.ts` and `src/i18n/params.ts` should build or parse it. A page receives `currency` from its params;
  it never reads the cookie.
- Revisit if the owner wants more currencies (each adds a full static copy) or moves to cache components / partial prerendering,
  where a runtime-cookie hole in a static shell could replace the segment.
