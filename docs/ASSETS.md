# Assets register

## Back and side angles — 2026-10-29 (FR-022, FR-030)

The owner explicitly approved AI-generated additional angles in this chat. The product catalogue
now contains 114 images: 38 existing front photographs plus 76 AI-generated back/side previews.
Back views replace the previous detail crops used on hover; side views are new third images.
These depict inferred designs, not photographed evidence of the rear construction of actual goods.
The gallery and localized image descriptions disclose the generated angles.

The built-in ImageGen tool generated twelve colour/view atlases using each product's existing
front photograph as a reference. Original Pexels sources/photographers for the references are
recorded below. OpenAI ImageGen is the generator, generation date 2026-10-29; no new stock licence
is claimed for generated output. The supplied stock references remain subject to their original
licences. All generated back/side outputs are marked **AI-generated: Yes**.

| Outputs under `public/images/products/` | Reference front image | Generated outputs                                                            |
| --------------------------------------- | --------------------- | ---------------------------------------------------------------------------- |
| `essential-tee/`                        | `sand-1.webp`         | All colours, `*-2.webp` back and `*-3.webp` side                             |
| `premium-hoodie/`                       | `black-1.webp`        | All colours, back and side                                                   |
| `essential-socks/`                      | `white-1.webp`        | All colours, heel/back and side                                              |
| `performance-short/`                    | `black-1.webp`        | All colours, back and side; generated model wears an opaque athletic T-shirt |
| `performance-long-sleeve/`              | `black-1.webp`        | All colours, back and side                                                   |
| `performance-socks/`                    | `black-1.webp`        | All colours, heel/back and side                                              |
| `everyday-jogger/`                      | `black-1.webp`        | All colours, back and side, waist-to-shoes framing                           |
| `coach-jacket/`                         | `black-1.webp`        | All colours, back and side                                                   |
| `relaxed-short/`                        | `sand-1.webp`         | All colours, back and side                                                   |
| `classic-cap/`                          | `sand-1.webp`         | All colours, back and side portraits                                         |
| `knit-beanie/`                          | `black-1.webp`        | All colours, back and side portraits                                         |
| `canvas-tote/`                          | `sand-1.webp`         | Both colours, rear face and narrow side/gusset                               |

The [prompt set](./product-angle-prompts.md) records generation instructions. Reviewed source
atlases are retained locally in ignored `.asset-sources/angles/`. The final 76 deliverables are
saved in the project under the product output directories above, 1200 × 1500 WebP, quality 82.
`scripts/prepare-product-angles.mjs` splits the atlases at reviewed row boundaries and applies
product-specific framing. Re-run it with the atlas directory to reproduce the exported assets.
`prepare-product-photography.mjs` now writes front images only, preserving these generated angles.

Review evidence in `docs/screenshots/product-angles/{en,th}-{mobile,desktop}.png` consists of
Playwright screenshots captured on 2026-10-29 from the local demo. They contain the licensed front
photographs and generated previews documented here; they introduce no additional third-party assets.

## Product photography — 2026-10-29 (FR-012, FR-022)

Historical first rollout; its 38 detail crops have since been superseded by the angles above.

All 76 product placeholders have been replaced with photographic previews across all 12 products.
These are real photographs, with manually masked garment recolouring to match the catalogue swatches.
Models, skin and surroundings are not AI-generated. The photographs illustrate this fictional demo
catalogue; they are not supplier photographs or evidence of actual Home Club inventory or endorsement.
Colour previews are illustrative, not colour-calibrated representations of manufactured products.

All sources below were checked as free to use under the [Pexels License](https://www.pexels.com/license/)
on 2026-10-29, which permits modification and website use. No model endorsement is implied.
All outputs are self-hosted 1200 × 1500 WebP photographs, quality 80, with a styled crop and detail crop
per colour. `scripts/prepare-product-photography.mjs` contains the source mapping, hand-traced masks,
luminance-preserving colour processing and crops. No AI-generated imagery is used.

| Product output directory under `public/images/products/` | Source                                                                                                         | Photographer        | Processing                                                     |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------- |
| `essential-tee/`, `relaxed-short/`                       | [Pexels 28079564](https://www.pexels.com/photo/a-man-in-a-white-t-shirt-and-shorts-28079564/)                  | Marlon Schmeiski    | Separate tee/shorts masks, colour variants, detail crop        |
| `premium-hoodie/`, `everyday-jogger/`                    | [Pexels 6311503](https://www.pexels.com/photo/unemotional-african-american-man-in-hoodie-in-studio-6311503/)   | Monstera Production | Separate hoodie/trouser masks; jogger crop focuses on trousers |
| `essential-socks/`, `performance-socks/`                 | [Pexels 6764342](https://www.pexels.com/photo/a-person-wearing-white-socks-6764342/)                           | cottonbro studio    | Sock-only mask, colour variants, tighter performance crop      |
| `performance-short/`                                     | [Pexels 936075](https://www.pexels.com/photo/woman-wearing-black-sports-bra-and-jogger-shorts-smiling-936075/) | nappy               | Shorts-only mask, colour variants, detail crop                 |
| `performance-long-sleeve/`                               | [Pexels 12400398](https://www.pexels.com/photo/woman-in-white-long-sleeves-12400398/)                          | Ivan Kazlouski      | Shirt-only mask, colour variants, detail crop                  |
| `coach-jacket/`                                          | [Pexels 6910349](https://www.pexels.com/photo/a-woman-in-beige-jacket-6910349/)                                | KoolShooters        | Jacket-only mask, colour variants, detail crop                 |
| `classic-cap/`                                           | [Pexels 7181333](https://www.pexels.com/photo/man-in-white-fitted-cap-7181333/)                                | Leo Chainz          | Cap-only mask, colour variants, portrait/detail crops          |
| `knit-beanie/`                                           | [Pexels 3760626](https://www.pexels.com/photo/photo-of-woman-wearing-white-beanie-3760626/)                    | Andrea Piacquadio   | Beanie-only mask, colour variants, detail crop                 |
| `canvas-tote/`                                           | [Pexels 1214212](https://www.pexels.com/photo/black-tote-bag-1214212/)                                         | Stephanie Ho        | Bag-only mask, colour variants, detail crop                    |

Download these nine IDs from `https://images.pexels.com/photos/ID/pexels-photo-ID.jpeg?w=1200`
as `ID.jpg` to an ignored local directory, then run:

```sh
node scripts/prepare-product-photography.mjs .asset-sources
```

Existing photography is protected from overwriting by `images:generate`.

## Fashion photography — 2026-10-28 (FR-010, FR-011)

Only the three Hero slides and four category tiles were replaced, as requested by the owner.
At that point product images remained procedural placeholders (replaced on 2026-10-29 above). These photographs illustrate mood and styling;
they do not depict Home Club products or imply that the models endorse this fictional demo store.

All six source photographs are marked free to use on their Pexels pages, checked on 2026-10-28.
The [Pexels License](https://www.pexels.com/license/) permits website and commercial use,
download and modification without required attribution. It prohibits implied endorsement,
offensive portrayals, sale of unaltered copies, stock redistribution and use as a trademark.
See also [Pexels commercial-use guidance](https://help.pexels.com/hc/en-us/articles/360042295214-Can-I-use-the-photos-and-videos-for-a-commercial-project).
This records the platform copyright licence, not independently obtained model/property releases.
No claim of exclusive rights or model endorsement is made. No AI generation, face alteration,
garment recolouring or third-party branding was added. No publishing or deployment was performed.

| File                                        | Source                                                                                                                                 | Licence        | Author              | Checked/downloaded | AI-generated    | Processing                                        |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------- | ------------------ | --------------- | ------------------------------------------------- |
| `public/images/brand/hero-1.webp`           | [Pexels 9255738](https://www.pexels.com/photo/man-and-woman-in-beige-and-white-outfits-9255738/)                                       | Pexels License | Ron Lach            | 2026-10-28         | No (photograph) | Upper-body crop, 1920 × 1080, WebP quality 76     |
| `public/images/brand/hero-2.webp`           | [Pexels 7318658](https://www.pexels.com/photo/a-woman-in-beige-tank-top-7318658/)                                                      | Pexels License | MART PRODUCTION     | 2026-10-28         | No (photograph) | Centre crop, 1920 × 1080, WebP quality 76         |
| `public/images/brand/hero-3.webp`           | [Pexels 10679171](https://www.pexels.com/photo/man-and-woman-in-beige-suit-standing-on-grass-field-10679171/)                          | Pexels License | cottonbro studio    | 2026-10-28         | No (photograph) | Centre crop, 1920 × 1080, WebP quality 76         |
| `public/images/categories/foundations.webp` | [Pexels 3754254](https://www.pexels.com/photo/man-and-woman-in-beige-long-sleeve-shirt-and-black-pants-standing-back-to-back-3754254/) | Pexels License | Ba Tik              | 2026-10-28         | No (photograph) | Top crop, 1200 × 800, WebP quality 76             |
| `public/images/categories/performance.webp` | [Pexels 7318658](https://www.pexels.com/photo/a-woman-in-beige-tank-top-7318658/)                                                      | Pexels License | MART PRODUCTION     | 2026-10-28         | No (photograph) | Centre crop, 1200 × 800, WebP quality 76          |
| `public/images/categories/lifestyle.webp`   | [Pexels 6311503](https://www.pexels.com/photo/unemotional-african-american-man-in-hoodie-in-studio-6311503/)                           | Pexels License | Monstera Production | 2026-10-28         | No (photograph) | Top crop, 1200 × 800, WebP quality 76             |
| `public/images/categories/accessories.webp` | [Pexels 6786900](https://www.pexels.com/photo/man-in-black-clothing-holding-a-white-shopping-bag-6786900/)                             | Pexels License | Artem Podrez        | 2026-10-28         | No (photograph) | Upper-body/tote crop, 1200 × 800, WebP quality 76 |

Download originals from `https://images.pexels.com/photos/ID/pexels-photo-ID.jpeg?w=2400`
(Accessories uses `w=1800`) into a local directory as `ID.jpg`, then run:

```sh
node scripts/prepare-fashion-images.mjs <source-directory>
```

This uses existing sharp, strips source metadata, retains the dimensions in the data model,
and keeps each Hero source below the 150 kB budget. Images are self-hosted through `next/image`;
no runtime request to Pexels, new dependency or CSP exception is needed.
English/Thai descriptions live in `src/data/brand.ts` and `src/data/categories.ts`.
Category tiles keep `alt=""` because their adjacent title/subtitle already name the link;
the localized descriptions remain available in the data without duplicating link announcements.

## Other assets

RULES §14: every image, font and icon shipped in the repository is logged here with its source, licence,
author, date and whether it is AI-generated. Placeholder or AI-generated imagery must be replaced or cleared
before any public marketing use.

| File                                                                            | Source                                                  | Licence                        | Author                                            | Date       | AI-generated                | Notes                                                                                                                                                   |
| ------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------ | ------------------------------------------------- | ---------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/reference/home-mockup.jpg`                                                | Owner-supplied design mock-up                           | Not cleared for redistribution | Owner (imagery illustrative, possibly AI)         | 2026-10-27 | Unknown (treated as yes)    | **Reference only. Not shipped; must not be copied into `public/`.** French copy and "Canada" text are not carried over.                                 |
| `src/app/icon.svg`                                                              | Drawn by the T01 builder (plain geometric "H" monogram) | Owner-owned placeholder        | T01 builder                                       | 2026-10-27 | No (hand-written SVG)       | Generated placeholder favicon, replace before marketing. Uses two raw hex fills because it is a standalone asset, not CSS.                              |
| `public/images/products/essential-tee/{sand,black,white,forest}-{1,2}.webp`     | Generated by `scripts/generate-placeholders.mjs`        | Owner-owned (original)         | T04 builder (procedural, no third-party material) | 2026-10-27 | No (procedural placeholder) | Generated placeholder, owner-owned, replace before marketing (RULES 14.3). 8 files, 1200x1500, flat tee silhouette (front and alternate view).          |
| `public/images/products/premium-hoodie/{black,grey,forest,sand}-{1,2}.webp`     | Generated by `scripts/generate-placeholders.mjs`        | Owner-owned (original)         | T04 builder (procedural, no third-party material) | 2026-10-27 | No (procedural placeholder) | Generated placeholder, owner-owned, replace before marketing (RULES 14.3). 8 files, 1200x1500, flat hoodie silhouette (front and alternate view).       |
| `public/images/products/essential-socks/{white,black,grey}-{1,2}.webp`          | Generated by `scripts/generate-placeholders.mjs`        | Owner-owned (original)         | T04 builder (procedural, no third-party material) | 2026-10-27 | No (procedural placeholder) | Generated placeholder, owner-owned, replace before marketing (RULES 14.3). 6 files, 1200x1500, flat socks silhouette (front and alternate view).        |
| `public/images/products/performance-short/{black,forest,grey}-{1,2}.webp`       | Generated by `scripts/generate-placeholders.mjs`        | Owner-owned (original)         | T04 builder (procedural, no third-party material) | 2026-10-27 | No (procedural placeholder) | Generated placeholder, owner-owned, replace before marketing (RULES 14.3). 6 files, 1200x1500, flat short silhouette (front and alternate view).        |
| `public/images/products/performance-long-sleeve/{black,grey,forest}-{1,2}.webp` | Generated by `scripts/generate-placeholders.mjs`        | Owner-owned (original)         | T04 builder (procedural, no third-party material) | 2026-10-27 | No (procedural placeholder) | Generated placeholder, owner-owned, replace before marketing (RULES 14.3). 6 files, 1200x1500, flat longsleeve silhouette (front and alternate view).   |
| `public/images/products/performance-socks/{black,white}-{1,2}.webp`             | Generated by `scripts/generate-placeholders.mjs`        | Owner-owned (original)         | T04 builder (procedural, no third-party material) | 2026-10-27 | No (procedural placeholder) | Generated placeholder, owner-owned, replace before marketing (RULES 14.3). 4 files, 1200x1500, flat socks silhouette (front and alternate view).        |
| `public/images/products/everyday-jogger/{grey,black,sand,forest}-{1,2}.webp`    | Generated by `scripts/generate-placeholders.mjs`        | Owner-owned (original)         | T04 builder (procedural, no third-party material) | 2026-10-27 | No (procedural placeholder) | Generated placeholder, owner-owned, replace before marketing (RULES 14.3). 8 files, 1200x1500, flat jogger silhouette (front and alternate view).       |
| `public/images/products/coach-jacket/{black,sand,forest}-{1,2}.webp`            | Generated by `scripts/generate-placeholders.mjs`        | Owner-owned (original)         | T04 builder (procedural, no third-party material) | 2026-10-27 | No (procedural placeholder) | Generated placeholder, owner-owned, replace before marketing (RULES 14.3). 6 files, 1200x1500, flat jacket silhouette (front and alternate view).       |
| `public/images/products/relaxed-short/{sand,forest,black}-{1,2}.webp`           | Generated by `scripts/generate-placeholders.mjs`        | Owner-owned (original)         | T04 builder (procedural, no third-party material) | 2026-10-27 | No (procedural placeholder) | Generated placeholder, owner-owned, replace before marketing (RULES 14.3). 6 files, 1200x1500, flat relaxedshort silhouette (front and alternate view). |
| `public/images/products/classic-cap/{sand,black,forest,white}-{1,2}.webp`       | Generated by `scripts/generate-placeholders.mjs`        | Owner-owned (original)         | T04 builder (procedural, no third-party material) | 2026-10-27 | No (procedural placeholder) | Generated placeholder, owner-owned, replace before marketing (RULES 14.3). 8 files, 1200x1500, flat cap silhouette (front and alternate view).          |
| `public/images/products/knit-beanie/{black,grey,sand}-{1,2}.webp`               | Generated by `scripts/generate-placeholders.mjs`        | Owner-owned (original)         | T04 builder (procedural, no third-party material) | 2026-10-27 | No (procedural placeholder) | Generated placeholder, owner-owned, replace before marketing (RULES 14.3). 6 files, 1200x1500, flat beanie silhouette (front and alternate view).       |
| `public/images/products/canvas-tote/{sand,black}-{1,2}.webp`                    | Generated by `scripts/generate-placeholders.mjs`        | Owner-owned (original)         | T04 builder (procedural, no third-party material) | 2026-10-27 | No (procedural placeholder) | Generated placeholder, owner-owned, replace before marketing (RULES 14.3). 4 files, 1200x1500, flat tote silhouette (front and alternate view).         |
| `src/components/ui/icons/*.tsx` (16 line icons)                                 | Original inline SVG, hand-written for this project      | Owner-owned (original)         | T02 builder                                       | 2026-10-27 | No                          | menu, search, bag, arrow-right, close, check, plus, minus, chevron-left/right, pause, play, award, leaf, truck, globe.                                  |
| `src/components/ui/brand-mark.tsx`                                              | Original inline SVG (circle + H monogram)               | Owner-owned (original)         | T02 builder                                       | 2026-10-27 | No                          | Placeholder identity for the fictional brand; owner to approve.                                                                                         |
| `src/components/ui/wordmark.tsx`                                                | Text lockup set in Jost                                 | Owner-owned (original)         | T02 builder                                       | 2026-10-27 | No                          | "HOME CLUB / FOUNDATION" lockup.                                                                                                                        |
| Jost 400/500/600 latin (`@fontsource/jost` 5.3.0)                               | npm, self-hosted via `next/font/local`                  | SIL OFL-1.1                    | Owen Earl                                         | 2026-10-27 | No                          | Display / wordmark font.                                                                                                                                |
| Inter 400/500/600 latin (`@fontsource/inter` 5.3.0)                             | npm, self-hosted via `next/font/local`                  | SIL OFL-1.1                    | Rasmus Andersson                                  | 2026-10-27 | No                          | Body / UI font.                                                                                                                                         |
| Noto Sans Thai 400/500/600 thai (`@fontsource/noto-sans-thai` 5.3.0)            | npm, self-hosted via `next/font/local`                  | SIL OFL-1.1                    | Google / Monotype                                 | 2026-10-27 | No                          | Thai text.                                                                                                                                              |

## Historical placeholder generator

The original 76 product placeholders were produced by a deterministic script (sharp, SVG to WebP).
It now only fills missing files, preserving all existing photographs:

```
node scripts/generate-placeholders.mjs
```

The generator preserves existing product, Hero and category photographs; it must not overwrite them.

The product, colour and hex lists live in `scripts/placeholder-manifest.mjs`; a unit test
(`tests/unit/data/invariants.test.ts`) checks that they match `src/data/products.ts` and that every image
referenced by the data exists with the recorded width and height. Current photography and its
licence records supersede the historical product placeholders (RULES 14.3).

## Phase 2 reuse and editorial content — 2026-10-29

Look/Vibes/Journal teasers reuse the product and category images already recorded above;
no additional photographs or image sources were introduced. Six EN/TH MDX files under
`src/content/journal` are original AI-assisted demo editorial copy authored for this project
on 2026-10-29, with no third-party excerpts. Thai copy requires owner review. Size-guide figures
are labeled illustrative body measurements and do not describe the photographed garments.

## Generated Open Graph images — 2026-10-31 (SEO NFR, ADR-0011)

Thirty-two 1200 x 630 PNG share images are generated at build time by `next/og` (Satori) from code in
`src/components/og/`: `/{locale}/og/home.png`, one per product and locale, one per journal article and
locale. They contain only typography, the brand colours from `tokens.css` and product swatch colours from
catalogue data; **no photograph and no third-party image is used**, and nothing in them is AI-generated.
Nothing is committed under `public/`.

| Font file (read at build from `node_modules/@fontsource`) | Source | Licence |
| --- | --- | --- |
| `jost/files/jost-latin-500-normal.woff` | Jost by Owen Earl, via `@fontsource/jost` | OFL-1.1 |
| `inter/files/inter-latin-400-normal.woff` | Inter by Rasmus Andersson, via `@fontsource/inter` | OFL-1.1 |

The fonts are the same families already self-hosted for the site (see ADR-0001); the licence field of each
package is `OFL-1.1`. The `.woff` files are embedded in the rendered PNGs only, not distributed.
