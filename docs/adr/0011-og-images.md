# ADR 0011 — Generated Open Graph images

Status: accepted (owner decision E2 in `docs/p3-plan.md`; SEO NFR, SPEC §10). Amends the OG-image
sentence of ADR-0003.

## Context

Shared links need a 1200 × 630 image per page type, localised, with no currency segment in the URL
(ADR-0003) and with every page still static. Findings that shaped the design (Next 16.4.3):

1. **A file-based `opengraph-image` above a page is dropped as soon as the page sets `openGraph`.**
   `resolveStaticMetadata` only merges file images into a segment's own metadata, and a page's
   `openGraph` object replaces its parents' wholesale. Every page here sets `openGraph` (`pageMetadata`),
   and the `[currency]` segment sits between `[locale]` and the pages, so an image at
   `app/[locale]/opengraph-image.tsx` was prerendered but never linked (checked in the built HTML).
   An image inside `[currency]/...` would carry `/usd/` in its URL. So images are referenced explicitly.
2. **`generateImageMetadata` receives no `params`** when Next discovers images at build, so a localised
   `alt` cannot come from it. The alt text is set in each page's metadata instead.
3. **Satori (behind `next/og`) does not decode WebP.** A WebP product photo rendered as nothing. Decoding
   it first needs `sharp` in the route, and an embedded photo makes the PNG several hundred kB, over the
   200 kB cap (`next/og` only writes PNG). The images are therefore typographic.
4. **Thai spike (Noto Sans Thai 400/500 `.woff` from `@fontsource`, 72–90 px, rendered and viewed).**
   Glyphs and most tone marks render, but Satori does not shape complex scripts: mai ek (่) was dropped
   after upper and lower vowels (`ที่` drew as `ที`, `ปู่` as `ปู`, `ปี่` as `ปี`), while `ไม่`, `เสื้อ`,
   `ให้`, `น้ำ` were fine. A dropped tone mark changes a Thai word, so Thai glyphs are not used.

## Decision

- **Placement.** Route handlers named `*.png`, under a dedicated currency-free segment of the locale:
  `app/[locale]/og/home.png`, `app/[locale]/og/products/[slug]/image.png`,
  `app/[locale]/og/journal/[slug]/image.png`. Public URLs are `/en/og/home.png`,
  `/th/og/products/essential-tee/image.png`, and so on. They do not overlap any page. All are static
  (`dynamicParams = false`, `generateStaticParams` locale × slug): 2 + 24 + 6 = 32 images.
- **Referencing.** `components/og/og-metadata.ts` `withOgImage()` is applied in the ten indexable pages'
  `generateMetadata` and sets `openGraph.images` and `twitter.images` (absolute URL through
  `absoluteUrl`, which throws on a currency segment; size 1200 × 630; localised alt from the `og.alt`
  messages). Home, shop, collections, vibes, looks and the journal index use the default image;
  products and articles use their own. Noindex pages (cart, checkout, success, search) get none. The
  case-study page (T6) must call `withOgImage` too.
- **Proxy.** No matcher change was needed: the URLs end in `.png`, and the existing literal already skips
  any path with a file extension. ADR-0003's claim that this covers "OG images" was untrue for the
  convention's extensionless URLs (`/en/opengraph-image`) and is now corrected; it holds because these
  routes are deliberately named with an extension. `tests/unit/proxy.test.ts` asserts the three URL
  shapes are skipped, and `tests/e2e/seo-og-image.spec.ts` requests an image with `hc_currency=THB` and
  `Accept-Language: th` and expects a plain 200 (no redirect, no rewrite).
- **Content.** Wordmark lockup, optional eyebrow (category, "Journal"), title, product colour swatches
  (catalogue data), and "Demo store. Nothing is sold." No price (the currency is the visitor's) and no
  photograph. Text is Latin for **both** locales (`CARD_TEXT_LOCALE` in `og-image.tsx`): the Thai image
  shows the English product name or article title. Alt text and all page metadata are localised.
- **Colours and fonts.** Satori cannot read CSS variables, so `og-assets.ts` reads the hex values of
  `--color-*` from `src/styles/tokens.css` at build time (no hex literal in components, so
  `design-tokens.test.ts` still holds). Fonts: `@fontsource/jost` 500 and `@fontsource/inter` 400,
  `.woff` files (Satori reads `.woff`/`.ttf`/`.otf`, not `.woff2`), read with `fs` at build. Both OFL-1.1.
  Noto Sans Thai is not loaded.

## Consequences

- Output: 32 PNGs, 42–53 kB each (cap 200 kB), 1200 × 630. Static pages 141 to 173; `pnpm build` 22.0 s to
  29.0 s on the author's Windows machine (single runs).
- The Thai card is not Thai. When Satori gains shaping, set `CARD_TEXT_LOCALE.th` to `'th'`, load Noto Sans
  Thai in `og-assets.ts`, and re-run the spike strings; the `seo.og.tagline`, `seo.og.demo` and `seo.og.journal` Thai
  strings already exist for that day (they are unused until then).
- Each new indexable page must call `withOgImage` (the e2e metadata sweep over the sitemap fails
  otherwise).
- Photographic cards would need a WebP-to-JPEG step and a size budget above 200 kB; not done.
- No new dependency; `next/og` ships with Next.
