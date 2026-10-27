# DESIGN — Visual and Interaction System

Reference: `docs/reference/home-mockup.jpg` (Home page, mobile-first composition). The mock-up is a **direction**, not pixel truth: use it for layout, mood, proportion and hierarchy; use this document for exact tokens and rules. Where they differ, this document wins.

Related: [PRD.md](./PRD.md) · [SPEC.md](./SPEC.md) · [RULES.md](./RULES.md)

---

## 1. Design principles

1. **Quiet luxury, athletic ease.** Generous whitespace, restrained palette, confident type. Product and people carry the colour.
2. **Foundations first.** Essentials are the hero; nothing competes with them.
3. **Calm motion.** Motion clarifies state; it never decorates. Everything works with motion off.
4. **Bilingual by design.** Thai and English are designed together; layout must survive Thai line-heights and longer strings.
5. **Fast is a feature.** Imagery and effects are chosen within the performance budget (SPEC §12).

## 2. Tokens

All tokens are CSS variables in `src/styles/tokens.css`, exposed to Tailwind. **Components never use raw hex values or arbitrary pixel values**; they use tokens.

### 2.1 Colour (light theme)

| Token | Value | Use |
|---|---|---|
| `--color-canvas` | `#F7F4EF` | Page background |
| `--color-surface` | `#EDE6DB` | Cards, panels (e.g. look banner), product image backdrop |
| `--color-ink` | `#141412` | Primary text, primary buttons, icons |
| `--color-muted` | `#5E584E` | Secondary text, captions |
| `--color-line` | `#CFC7BA` | Decorative dividers (not for interactive borders) |
| `--color-field` | `#857C6E` | Input/control borders (≥ 3:1 UI contrast) |
| `--color-sand` | `#D6BF9C` | Brand accent; "sand" product colour; subtle highlights |
| `--color-forest` | `#2B372D` | Brand secondary; dark sections; "forest" product colour |
| `--color-danger` | `#A3261F` | Errors |
| `--color-success` | `#2F6B3F` | Confirmations |
| `--color-focus` | `#1F4FD8` | Focus ring (2 px + 2 px offset) |
| `--color-focus-on-dark` | `#9DB8FF` | Focus ring on ink, forest and photography (transparent header, dark sections). Applied by putting `data-on-dark` on the surface |
| `--color-overlay` | `rgb(20 20 18 / 0.45)` | Scrim over photography for text |

Product swatch colours (`sand`, `black`, `forest`, `grey`, `white`) come from catalogue data, not from tokens. Swatches always have a 1 px `--color-field` ring so light colours stay visible.

### 2.2 Dark theme
Out of scope for P1–P4. Tokens are structured so a `[data-theme="dark"]` map can be added later; do not hard-code light values in components.

### 2.3 Verified contrast (WCAG)

| Pair | Ratio | Passes |
|---|---|---|
| ink on canvas | 16.8:1 | AAA |
| muted on canvas | 6.4:1 | AA text |
| muted on surface | 5.7:1 | AA text |
| canvas on ink (button text) | 16.8:1 | AAA |
| ink on sand | 10.4:1 | AAA |
| canvas on forest | 11.4:1 | AAA |
| danger on canvas | 6.7:1 | AA text |
| success on canvas | 5.8:1 | AA text |
| focus on canvas | 6.0:1 | AA non-text |
| focus-on-dark on ink | 9.4:1 | AA non-text |
| focus-on-dark on forest | 6.4:1 | AA non-text |
| `--color-focus` on ink / forest | 2.8:1 / 1.9:1 | Fails (< 3:1): never use the default ring on dark surfaces |
| focus-on-dark on canvas | 1.8:1 | Fails: the light ring must never be used on a light surface |
| field border on canvas / surface | 3.8:1 / 3.3:1 | AA non-text (≥ 3:1) |
| white text on `--color-overlay` over photography | Verify per image (see §9) | — |

If a token changes, recompute and update this table in the same PR.

## 3. Typography

| Role | Latin | Thai | Notes |
|---|---|---|---|
| Display / wordmark | **Jost** | **Noto Sans Thai** | Wide, geometric; uppercase with tracking for brand and section labels |
| Body / UI | **Inter** | **Noto Sans Thai** | |

Load with `next/font` (self-hosted, `display: swap`), subsets `latin` and `thai`. Max 3 weights per family (400, 500, 600). Fallback stack: `system-ui, sans-serif`. Final family choices may be swapped for any open-licensed equivalents with Thai support; record the decision in an ADR.

### 3.1 Scale (fluid, mobile → desktop)

| Token | Size (min → max) | Line height (EN / TH) | Tracking | Use |
|---|---|---|---|---|
| `text-display` | 36 → 72 px | 1.05 / 1.25 | 0.01em | Hero headline (uppercase) |
| `text-h1` | 28 → 44 px | 1.1 / 1.3 | 0.02em | Page titles |
| `text-h2` | 20 → 28 px | 1.2 / 1.4 | 0.06em | Section titles (uppercase label style) |
| `text-h3` | 16 → 20 px | 1.3 / 1.5 | 0.04em | Card titles |
| `text-body` | 16 px | 1.6 / 1.75 | 0 | Paragraphs |
| `text-small` | 14 px | 1.5 / 1.65 | 0.01em | Captions, meta |
| `text-eyebrow` | 11–12 px | 1.4 / 1.6 | 0.18em | Uppercase eyebrow labels, prices on cards |
| `text-wordmark` | 20–28 px | 1 | 0.3em | "HOME CLUB" lockup + "FOUNDATION" sub-line |

Thai rules: apply the Thai line-height via `:lang(th)`; **never uppercase or letter-space Thai text**; avoid fixed-height text boxes; allow wrapping at word boundaries (`word-break: normal`, `overflow-wrap: anywhere` only for URLs). Minimum Thai body size 16 px.

## 4. Spacing, layout, shape

- **Base unit** 4 px. Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- **Container:** max 1280 px, side padding 16 px (mobile) / 24 px (tablet) / 40 px (desktop).
- **Grid:** 4 columns mobile, 8 tablet, 12 desktop; gap 16/24/24.
- **Breakpoints:** `sm 640`, `md 768`, `lg 1024`, `xl 1280`. Design mobile-first; test at 360, 375, 768, 1280, 1536.
- **Section rhythm:** 64 px vertical (mobile) → 96–128 px (desktop).
- **Radius:** `sm 6`, `md 12` (cards, panels, hero sheet), `lg 20`, `full` (pills, swatches). The mock-up uses soft ~12–16 px corners on tiles and a rounded top edge where the hero meets content.
- **Elevation:** almost none. Prefer tone (surface vs canvas) and 1 px lines. One soft shadow token for floating layers (drawer, menu): `0 8px 32px rgb(20 20 18 / 0.12)`.
- **Aspect ratios:** product cards 1:1; product gallery 4:5; category tiles 16:9 (mobile) / 3:2 (desktop); vibes tiles 4:5 (mobile) / 3:4 (desktop). The mock-up shows near-square cards, so cards stay 1:1.

## 5. Components

Each component documents states: default, hover, focus-visible, active, disabled, loading, error.

### 5.1 Button
| Variant | Style |
|---|---|
| Primary | `ink` background, `canvas` text, uppercase `text-eyebrow` + 0.14em tracking, height 48 (min 44), radius `md`, optional trailing arrow icon |
| Secondary | `canvas` background, `ink` text, 1 px `ink` border |
| On-image | `canvas` background, `ink` text (as hero "DÉCOUVRIR"/"Discover" button) |
| Link | Underlined text with arrow, used for "See all →" |
Hover: invert or shift tone ≤ 8%; no scale jumps. Disabled: 40% opacity + `aria-disabled`, never remove from tab order if it explains why.

### 5.2 Header
Transparent over hero (text `canvas`), switches to `canvas` background + `ink` text once scrolled past the hero or on non-hero pages. Hamburger left, wordmark centred, search and cart right. Cart badge: 16–18 px pill, `ink` on `canvas` over hero / inverse when solid. Height 64 (mobile) / 80 (desktop).
Built (T06): the hamburger stays at every viewport size, as in the mock-up; it opens a left drawer with Home, Shop all, the four categories, the language links and the currency radios. The same category links are real links in the footer, which is also the no-JavaScript way into the catalogue. A page that opens with a hero puts an element with `data-header-sentinel` on the hero's bottom edge; the stylesheet reads it with `body:has([data-header-sentinel])`, so the header is transparent (canvas text, top-to-transparent `--color-overlay` scrim, light focus ring from §2.3) in the server HTML, and the hero slides under it. A small island sets `data-past-hero` once that edge has scrolled up under the header, which turns it solid canvas/ink. Pages without a sentinel are solid from the first paint. Without JavaScript a hero page keeps the transparent header, so the hero must be taller than the viewport. Search and cart are present but inert (`aria-disabled`, still focusable, with a spoken reason, 8 px apart) until their features exist; the cart badge box is reserved so the count adds no layout shift. The lockup gives back its trailing letter-spacing (`wordmark-line`) so it is optically centred, and its sub-line is at least 11 px.

### 5.3 Hero
Full-bleed photograph, text block bottom-left, headline in `text-display` uppercase with a bolder first line and lighter second line (as in the mock-up), single on-image button, slide indicators bottom-left (three short bars; active is longer/solid). A rounded-top content sheet overlaps the hero's lower edge. Text must sit on a scrim (`--color-overlay` gradient) that keeps contrast ≥ 4.5:1 for the headline.

### 5.4 Category tile
Image with dark gradient, uppercase title + muted subtitle, trailing line-arrow. Whole tile is one link. Hover: image scale ≤ 1.03 over 300 ms, arrow shifts 4 px.

### 5.5 Product card
1:1 image on `surface` backdrop, name in `text-eyebrow` uppercase, price below, swatches (16 px circles with ring) row. Entire card is one link; swatches are non-interactive on cards in P1. Hover: swap to alternate image if available.

### 5.6 Look banner and builder
`surface` panel: left column with eyebrow ("LOOK COMPLET" / "Complete look"), headline, short copy, dark button with the computed total underneath; right column shows four product cut-outs joined by `+` glyphs with name and price captions. Mobile stacks vertically. In the builder each slot shows the product image, colour swatches (interactive), size selector, and a per-slot status line; the summary shows list total, discount (with "You save …"), and final total. Out-of-stock state: slot outlined in `danger`, message with icon (never colour alone), alternatives offered inline.

### 5.7 Editorial block ("Tips")
Two-up: lifestyle photo (radius `md`) and text; eyebrow, `text-h2`, short paragraph, link. To the right on desktop: trust column with three icon + title + caption items separated by a vertical `line`.

### 5.8 Vibes row
Five image tiles in a horizontally scrollable row on mobile (scroll-snap, visible peek of next tile), five-up grid on desktop. Label bottom-left on scrim, trailing arrows.

### 5.9 Forms
Labels above fields, 48 px control height, `field` border, radius `md`, error text below with icon, `aria-describedby` wired. Never rely on placeholder as label.

### 5.10 Cart drawer
Right-side drawer (full-width sheet on mobile), line items with thumbnail, name, colour/size, qty stepper, remove; look group shows set name and discount line; sticky footer with subtotal and checkout button. Focus trapped; `Esc` closes.

### 5.11 Notices
"Demo store — no payment taken" banner: `surface` background, `ink` text, icon, non-dismissible on checkout, dismissible elsewhere.

## 6. Iconography
Line icons, 1.5 px stroke, 20/24 px grid, `currentColor`. One library (`lucide-react` or equivalent). Brand mark: circle containing an "H" monogram, delivered as inline SVG that inherits colour. Decorative icons `aria-hidden`; meaningful icons carry text or `aria-label`.

## 7. Motion

| Token | Value |
|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `--dur-fast` | 120 ms |
| `--dur-base` | 200 ms |
| `--dur-slow` | 400 ms |

- Allowed: fade, small translate (≤ 12 px), image scale ≤ 1.03, drawer slide, carousel cross-fade.
- Not allowed: parallax, scroll-jacking, auto-playing video, infinite loops.
- `prefers-reduced-motion: reduce` → no transforms, fades ≤ 100 ms, carousel never advances on its own.
- Animate only `opacity` and `transform`.

## 8. Layout notes per page (from the mock-up)

**Home order:** Hero → Category tiles → Essentials (4-up) → Look banner → Editorial + Trust → Vibes row → Footer band ("Join the Club").
**Collection:** page title + count, filter/sort bar (sticky on mobile), 2-up grid mobile / 3-up tablet / 4-up desktop.
**Product:** gallery left (sticky on desktop), details right: name, price, colour, size + guide, add-to-cart, accordion for description/materials/care, "Goes well with".
**Look builder:** four slot cards in a 2×2 (mobile 1-col), sticky summary on desktop, bottom sheet summary on mobile.
**Checkout:** single column form + order summary; demo notice at top.

## 9. Imagery

- Style: natural light, warm neutrals, architectural/outdoor backdrops, real movement (sport vibes). Product shots on `surface` tone, flat-lay or ghost-mannequin, consistent crop and margin.
- Naming: `public/images/products/{slug}/{colorId}-{n}.avif|webp|jpg`.
- Deliver `width`/`height`; compress to budget (SPEC §12); provide meaningful `alt` in both locales (describe garment, colour, context — not "image of").
- Text over photos requires the scrim and a contrast check on the actual image at mobile and desktop crops.
- The mock-up's imagery is illustrative only. Every shipped image must be logged in `docs/ASSETS.md` with source and licence (RULES §14).

## 10. Content and tone

- Voice: confident, minimal, warm; short sentences; no hype or exclamation marks.
- Section labels are uppercase in English; Thai labels use normal case.
- Example hero (EN): "START WITH THE ESSENTIAL. LIVE YOUR VIBE." · CTA "Discover".
- Example hero (TH): "เริ่มที่ความเรียบง่าย แล้วใช้ชีวิตให้เป็นสไตล์คุณ" · CTA "ดูคอลเลกชัน". Copy is a draft; owner approves final TH wording.
- The mock-up's French strings and "Partout au Canada" are not carried over. Trust copy is demo-neutral (e.g. "Fast delivery", "ส่งไว").
- Prices are always formatted by `formatMoney`; never typed into copy.

## 11. Accessibility in design

- Touch targets ≥ 44 × 44 px; spacing between adjacent targets ≥ 8 px.
- Focus ring `--color-focus` 2 px with 2 px offset on every interactive element; never `outline: none` without a replacement.
- Colour is never the only signal (stock, errors, selected swatch use text/icon/shape too; selected swatch gets a thicker ring and a check).
- Carousels, drawers and menus are fully keyboard operable and announce state.
- Text must reflow at 200% zoom and with 320 px width without horizontal scrolling.

## 12. Design QA checklist (per page, before "done")

- [ ] Matches mock-up composition at 375 and 1280 px; tokens only, no ad-hoc values.
- [ ] EN and TH both reviewed; no clipped Thai glyphs; long strings wrap.
- [ ] THB and USD price formats verified.
- [ ] Focus order logical; all states (hover/focus/disabled/error/empty) implemented.
- [ ] Contrast verified for any new colour pair; table in §2.3 updated.
- [ ] Reduced-motion tested.
- [ ] CLS = 0 on load; images have dimensions.
