# Product-angle generation prompt set

Built-in ImageGen edit mode, 2026-10-29, explicitly approved by the owner. No CLI fallback was used.
Each product was generated as a single multi-colour, two-view atlas. Final cropped exports live
in `public/images/products/<slug>/<colour>-2.webp` (back) and `-3.webp` (side).

Shared final prompt specification:

> Create one photorealistic fashion e-commerce multi-view sprite-sheet atlas using the supplied
> front photograph as the identity, garment and lighting reference. Preserve the same adult model,
> face, hair, skin tone, physique, clothing cut, texture, seams, setting and lighting. Only the target
> garment changes colour. Use equal columns in the colour order listed below and two equal rows:
> top row is a genuine 180-degree back view with the whole torso turned away; bottom row is a
> genuine 90-degree side view with the whole torso turned sideways. Keep subject centred at a
> consistent camera scale, with safe margins. Use a precise borderless grid; no captions, labels,
> logos, watermarks, gutters, dividing lines or overlapping cells. Every cell must be independently
> usable as a product photograph. Do not substitute a front pose for either requested angle.

Product-specific final prompts and reference roles:

| Product / reference                                       | Columns left to right          | Additional instructions                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Essential tee / `essential-tee/sand-1.webp`               | sand, black, off-white, forest | Preserve short curly hair, beard and tattoos, beige shorts and green/white shoes, light gray studio. Full-body framing. No invented graphics on tee back.                                                                                                                                                        |
| Premium hoodie / `premium-hoodie/black-1.webp`            | black, grey, forest, sand      | Preserve young adult Black male model with short dreadlocks, plain fleece pullover, off-white pants and warm gray studio; head-to-upper-thigh framing. Hood rests down. No rear kangaroo pocket, zipper or graphics.                                                                                             |
| Essential socks / `essential-socks/white-1.webp`          | off-white, black, grey         | Same adult leg, ribbed crew sock and indoor gym. Knee-to-toes crop, sock outside a shoe. Top row shows heel/back; bottom row side profile. Do not invent a full person.                                                                                                                                          |
| Performance shorts / `performance-short/black-1.webp`     | black, forest, grey            | Professional nonsexual sporting-goods catalogue, same adult athlete identity and short natural hair, outdoor stairs. Neutral standing pose and opaque loose black athletic T-shirt covering torso, same athletic shorts. Fully back-facing top row, side profile bottom row. Head-to-knees or full-body framing. |
| Long-sleeved top / `performance-long-sleeve/black-1.webp` | black, grey, forest            | Same adult woman with long wavy brown hair, fitted ribbed long-sleeved crewneck, dark trousers and industrial light gray interior. Head-through-hips framing. Move hair to one shoulder to reveal shirt back.                                                                                                    |
| Performance socks / `performance-socks/black-1.webp`      | black, off-white               | Same ribbed crew sock, adult lower legs and gym. Top row heel/back, bottom row side. Whole sock visible outside a shoe.                                                                                                                                                                                          |
| Everyday jogger / `everyday-jogger/black-1.webp`          | black, sand, forest, grey      | Adult male model, relaxed plain cotton jogger pants with elastic waist/cuffs and off-white hoodie, gray studio. Waist-to-shoes framing showing complete pants. Hips/legs fully back-facing, then fully sideways. Hoodie stays off-white.                                                                         |
| Coach jacket / `coach-jacket/black-1.webp`                | black, sand, forest            | Same adult woman with platinum blonde bob, plain textured collared button-front jacket, checked outfit underneath and moody vintage green interior. Head-through-upper-thigh framing. Back has no front buttons.                                                                                                 |
| Relaxed shorts / `relaxed-short/sand-1.webp`              | sand, forest, black            | Same adult male model, short curly hair/beard, tattoos, off-white tee, green/white shoes and gray studio. Full-body views. Only shorts change colour.                                                                                                                                                            |
| Classic cap / `classic-cap/sand-1.webp`                   | sand, black, forest, off-white | Same adult male face/hair/beard, denim jacket, blurred blue/white architecture. Head-and-shoulders portraits. Back shows adjustable strap/opening, no face/front brim. Side wears cap normally forward. Cap fully within frame.                                                                                  |
| Knit beanie / `knit-beanie/black-1.webp`                  | black, grey, sand              | Same adult blonde woman, black coat, off-white scarf and outdoor winter bokeh. Visible cable-knit texture. Head/shoulders fully back-facing or side profile. Beanie entirely visible.                                                                                                                            |
| Canvas tote / `canvas-tote/sand-1.webp`                   | sand, black                    | Same rectangular canvas tote with long handles, wooden stand, geometric sunlit wall/shadow. No person. Top row opposite/back face; bottom row narrow side/gusset showing depth. Keep complete bag and straps in frame.                                                                                           |

Palette targets were sand `#D6BF9C`, black `#1F1E1B`, forest `#2B372D`, grey `#8C8981`,
off-white `#F4F1EA`. Generated colours and unseen construction are illustrative, not verified
manufacturing specifications. All reference images were edit targets inspected before generation.

The first sports-shorts generation was rejected by the image service. The retained final prompt
uses ordinary opaque athletic T-shirt styling, neutral standing and standard catalogue framing.
All final assets were visually reviewed for correct angle, colour order, anatomy and safe crops.
