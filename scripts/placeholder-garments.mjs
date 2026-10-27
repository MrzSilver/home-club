// Flat garment silhouettes drawn as SVG for the placeholder generator (docs/ASSETS.md).
// Every drawing is original geometry written for this project. Coordinates are local to each garment;
// the generator scales and centres them using the returned bounding box.

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) =>
  `#${rgb
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

export function mix(from, to, amount) {
  const a = toRgb(from);
  const b = toRgb(to);
  return toHex(a.map((v, i) => v + ((b[i] ?? v) - v) * amount));
}

const luminance = (hex) => {
  const [r = 0, g = 0, b = 0] = toRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

// Outline, seam and shade tones derived from the garment colour, so white and sand garments keep a
// visible edge on the surface backdrop and black garments keep readable detail lines.
export function palette(fill) {
  const light = luminance(fill) > 0.42;
  return {
    fill,
    line: light ? mix(fill, '#000000', 0.36) : mix(fill, '#ffffff', 0.26),
    seam: light ? mix(fill, '#000000', 0.2) : mix(fill, '#ffffff', 0.17),
    deep: mix(fill, '#000000', 0.32),
    soft: light ? mix(fill, '#ffffff', 0.35) : mix(fill, '#ffffff', 0.1),
  };
}

const shape = (d, c, fill = c.fill, width = 7) =>
  `<path d="${d}" fill="${fill}" stroke="${c.line}" stroke-width="${width}" stroke-linejoin="round"/>` +
  `<path d="${d}" fill="url(#shine)"/>`;

const seam = (d, c, width = 4, dash = '') =>
  `<path d="${d}" fill="none" stroke="${c.seam}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;

const stitch = (d, c) => seam(d, c, 4, '1 11');

const circle = (x, y, r, c, fill = c.soft) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${c.line}" stroke-width="3"/>`;

// Small "H" monogram: circle plus an H drawn with strokes (no font dependency).
const mark = (x, y, scale, c) =>
  `<g transform="translate(${x} ${y}) scale(${scale})" opacity="0.8" fill="none" stroke="${c.seam}" stroke-linecap="round" stroke-width="5">` +
  `<circle r="26"/><path d="M-9 -12V12M9 -12V12M-9 0H9"/></g>`;

const tee = (view, c) => {
  const front = view === 'front';
  const neck = front ? 'Q400 138 300 40' : 'Q400 70 300 40';
  const body = `M300 40L140 95L20 235L110 300L190 262L185 740Q400 752 615 740L610 262L690 300L780 235L660 95L500 40${neck}Z`;
  let svg = shape(body, c);
  if (front) {
    svg += `<path d="M300 40Q400 22 500 40Q400 138 300 40Z" fill="${c.deep}"/>`;
    svg += seam('M306 50Q400 128 494 50', c, 6);
    svg += mark(540, 190, 0.85, c);
  } else {
    svg += seam('M300 44Q400 76 500 44', c, 6);
    svg += seam('M215 125Q400 160 585 125', c, 4);
    svg += `<rect x="378" y="84" width="44" height="26" rx="4" fill="${c.soft}" stroke="${c.line}" stroke-width="3"/>`;
  }
  svg += seam('M190 262Q168 170 148 98', c) + seam('M610 262Q632 170 652 98', c);
  svg += stitch('M35 214L125 279', c) + stitch('M765 214L675 279', c);
  svg += stitch('M187 708Q400 721 613 708', c);
  return { bbox: [20, 30, 780, 755], svg };
};

// Torso plus two separate sleeves, shared by hoodie, long sleeve and jacket.
// `neck` is [leftX, rightX, y, curveBackToLeft]; the curve is drawn from the right neck point.
const sleevedBody = (c, { neck, hemY = 745 }) => {
  const [leftX, rightX, y, curve] = neck;
  const torso = `M${leftX} ${y}L170 108L192 300L190 ${hemY}Q400 ${hemY + 12} 610 ${hemY}L608 300L630 108L${rightX} ${y}${curve}Z`;
  const left = 'M168 100C128 150 98 270 70 400L36 700L142 714L172 560C190 470 210 380 218 292Z';
  const right = 'M632 100C672 150 702 270 730 400L764 700L658 714L628 560C610 470 590 380 582 292Z';
  return (
    shape(torso, c) +
    shape(left, c) +
    shape(right, c) +
    stitch('M44 662L146 676', c) +
    stitch('M756 662L654 676', c)
  );
};

const hoodie = (view, c) => {
  const front = view === 'front';
  let svg = sleevedBody(c, { neck: [295, 505, 62, 'L295 62'], hemY: 760 });
  if (front) {
    svg += shape(
      'M285 62C268 -18 330 -52 400 -52C470 -52 532 -18 515 62C482 132 440 168 400 168C360 168 318 132 285 62Z',
      c,
    );
    svg += `<path d="M332 44C350 -4 450 -4 468 44C455 112 430 142 400 142C370 142 345 112 332 44Z" fill="${c.deep}"/>`;
    svg += seam('M372 150L366 300', c, 5) + seam('M428 150L434 300', c, 5);
    svg += circle(366, 306, 7, c) + circle(434, 306, 7, c);
    svg += shape('M268 520L532 520L580 706L220 706Z', c);
    svg += seam('M268 520L220 706', c, 4) + seam('M532 520L580 706', c, 4);
    svg += stitch('M270 532L534 532', c);
  } else {
    svg += shape(
      'M268 62C270 -30 330 -60 400 -60C470 -60 530 -30 532 62C535 190 470 270 400 282C330 270 265 190 268 62Z',
      c,
    );
    svg += seam('M400 -50L400 280', c, 4);
    svg += seam('M300 40C310 120 350 200 400 214C450 200 490 120 500 40', c, 4);
  }
  svg += stitch('M196 728Q400 740 604 728', c);
  return { bbox: [30, -60, 770, 768], svg };
};

const longsleeve = (view, c) => {
  const front = view === 'front';
  const curve = front ? 'Q400 150 300 55' : 'Q400 82 300 55';
  let svg = sleevedBody(c, { neck: [300, 500, 55, curve] });
  if (front) {
    svg += `<path d="M300 55Q400 36 500 55Q400 150 300 55Z" fill="${c.deep}"/>`;
    svg += seam('M308 64Q400 138 492 64', c, 6);
    svg += mark(540, 205, 0.85, c);
  } else {
    svg += seam('M300 58Q400 86 500 58', c, 6);
    svg += seam('M215 140Q400 175 585 140', c, 4);
  }
  svg += stitch('M194 722Q400 734 606 722', c);
  return { bbox: [36, 40, 764, 760], svg };
};

const jacket = (view, c) => {
  const front = view === 'front';
  let svg = sleevedBody(c, { neck: [290, 510, 62, 'L290 62'], hemY: 748 });
  if (front) {
    svg += shape('M284 58L400 40L400 158L336 114Z', c, c.soft);
    svg += shape('M516 58L400 40L400 158L464 114Z', c, c.soft);
    svg += seam('M400 158L400 742', c, 4);
    for (const y of [230, 330, 430, 530, 630]) svg += circle(414, y, 9, c);
    svg += seam('M214 560L268 628', c, 6) + seam('M586 560L532 628', c, 6);
  } else {
    svg += shape('M284 58Q400 30 516 58L506 104Q400 66 294 104Z', c, c.soft);
    svg += seam('M400 100L400 742', c, 4);
    svg += seam('M205 150Q400 190 595 150', c, 4);
  }
  svg += stitch('M194 720L606 720', c);
  return { bbox: [36, 30, 764, 760], svg };
};

const waistband = (c, x0, x1, y1, drop) =>
  shape(`M${x0} 0L${x1} 0L${x1 + drop} ${y1}L${x0 - drop} ${y1}Z`, c, c.soft);

const shortFront = (c, front) => {
  const d =
    'M150 0L550 0C590 150 625 300 655 462L392 462C378 360 364 270 350 205C336 270 322 360 308 462L45 462C75 300 110 150 150 0Z';
  let svg = shape(d, c) + waistband(c, 150, 550, 56, 6);
  svg += front
    ? seam('M332 56L318 150', c, 5) +
      seam('M368 56L382 150', c, 5) +
      circle(318, 156, 7, c) +
      circle(382, 156, 7, c) +
      seam('M350 56L350 205', c, 3)
    : seam('M350 56L350 205', c, 4) +
      stitch('M200 140L290 140L290 210', c) +
      stitch('M500 140L410 140L410 210', c);
  svg +=
    seam('M128 78C104 210 84 330 68 436', c, 9) + seam('M572 78C596 210 616 330 632 436', c, 9);
  svg += stitch('M56 440L304 440', c) + stitch('M396 440L644 440', c);
  return { bbox: [45, 0, 655, 465], svg };
};

const relaxedShort = (view, c) => {
  const front = view === 'front';
  const d =
    'M165 0L535 0C570 200 610 400 640 560L402 560C388 420 372 310 350 235C328 310 312 420 298 560L60 560C90 400 130 200 165 0Z';
  let svg = shape(d, c) + waistband(c, 165, 535, 56, 5);
  svg += front
    ? seam('M350 56L350 235', c, 3) +
      circle(350, 80, 8, c) +
      seam('M180 70C230 140 250 190 252 250', c, 4) +
      seam('M520 70C470 140 450 190 448 250', c, 4)
    : seam('M350 56L350 235', c, 4) +
      stitch('M190 160L290 160L290 240', c) +
      stitch('M510 160L410 160L410 240', c);
  svg += stitch('M70 528L296 528', c) + stitch('M404 528L630 528', c);
  return { bbox: [60, 0, 640, 562], svg };
};

const short = (view, c) => shortFront(c, view === 'front');

const jogger = (view, c) => {
  const front = view === 'front';
  const d =
    'M130 0L470 0C505 190 510 460 470 840L365 840C345 620 320 420 300 300C280 420 255 620 235 840L130 840C90 460 95 190 130 0Z';
  let svg = shape(d, c) + waistband(c, 130, 470, 60, 3);
  svg += shape('M135 828L233 828Q232 868 230 900L140 900Q136 868 135 828Z', c, c.deep);
  svg += shape('M367 828L465 828Q464 868 460 900L370 900Q364 868 367 828Z', c, c.deep);
  svg += seam('M300 60L300 300', c, 3);
  svg += front
    ? seam('M285 60L276 150', c, 5) +
      seam('M315 60L324 150', c, 5) +
      circle(276, 156, 7, c) +
      circle(324, 156, 7, c) +
      seam('M138 84Q178 150 188 215', c, 4) +
      seam('M462 84Q422 150 412 215', c, 4)
    : stitch('M160 150L250 150L250 225L205 245L160 225Z', c) +
      stitch('M440 150L350 150L350 225L395 245L440 225Z', c);
  return { bbox: [85, 0, 515, 905], svg };
};

// Six-panel baseball cap. The generator's "front" view is the first image of a product, so for the cap
// it is the side profile (the most recognisable cap shape); the alternate view is the head-on front.
const cap = (view, c) => {
  if (view === 'front') {
    let svg = shape('M105 335C95 110 270 40 400 45C525 50 615 150 622 335Z', c);
    svg +=
      seam('M400 46Q384 190 376 332', c, 4) +
      seam('M268 74Q300 190 304 332', c, 4) +
      seam('M520 90Q560 200 566 332', c, 4);
    svg += stitch('M104 322L622 322', c);
    svg += circle(400, 48, 11, c);
    // Peak: leaves the front of the crown and curves out and slightly down.
    svg += shape('M560 318C650 296 765 318 818 374C760 408 650 404 585 376Z', c, c.soft);
    svg += seam('M590 336C660 326 745 338 790 366', c, 3);
    // Adjustable strap tab at the back.
    svg += `<rect x="88" y="300" width="50" height="40" rx="6" fill="${c.soft}" stroke="${c.line}" stroke-width="3"/>`;
    return { bbox: [86, 36, 822, 410], svg };
  }
  // Head-on: the peak points at the viewer, so it shows as a wide crescent below the crown with a
  // shaded underside.
  const peak = 'M108 342Q380 364 652 342C682 404 540 482 380 484C220 482 78 404 108 342Z';
  let svg = shape(peak, c, c.soft);
  svg += `<path d="${peak}" fill="${c.deep}" opacity="0.24"/>`;
  svg += seam('M380 372L380 476', c, 3);
  svg += shape('M135 345C125 125 250 38 380 38C510 38 635 125 625 345Q380 372 135 345Z', c);
  svg +=
    seam('M380 40L380 366', c, 4) +
    seam('M255 56Q285 190 292 360', c, 4) +
    seam('M505 56Q475 190 468 360', c, 4);
  svg += circle(380, 42, 12, c) + mark(380, 205, 1.1, c);
  return { bbox: [78, 28, 682, 488], svg };
};

const beanie = (view, c) => {
  const front = view === 'front';
  let svg = shape('M130 400C115 130 230 25 320 25C410 25 525 130 510 400Z', c);
  svg +=
    seam('M320 28L320 398', c, 4) +
    seam('M250 46Q214 210 208 398', c, 4) +
    seam('M390 46Q426 210 432 398', c, 4);
  svg += shape(
    'M98 392L542 392L546 520C546 538 532 546 518 546L122 546C108 546 94 538 94 520Z',
    c,
    c.soft,
  );
  for (let x = 124; x <= 516; x += 28) svg += seam(`M${x} 408L${x} 530`, c, 3);
  if (front)
    svg +=
      `<rect x="292" y="428" width="56" height="64" rx="6" fill="${c.fill}" stroke="${c.line}" stroke-width="3"/>` +
      mark(320, 460, 0.7, c);
  return { bbox: [90, 20, 550, 550], svg };
};

const sock = (c, id) => {
  const d =
    'M40 0L220 0L220 540C250 580 330 590 440 600C540 610 560 700 520 760C490 800 380 800 300 800L130 800C50 800 10 740 20 660Z';
  let svg = `<clipPath id="${id}"><path d="${d}"/></clipPath>`;
  svg += shape(d, c);
  svg += `<g clip-path="url(#${id})">`;
  svg += `<rect x="0" y="0" width="260" height="78" fill="${c.soft}"/><path d="M0 78H260" stroke="${c.line}" stroke-width="4"/>`;
  svg += `<rect x="0" y="100" width="260" height="14" fill="${c.deep}" opacity="0.5"/>`;
  svg += `<path d="M10 640C10 740 50 810 140 810L260 810L260 640Z" fill="${c.deep}" opacity="0.45"/>`;
  svg += `<path d="M400 595C540 600 570 700 530 770L400 800Z" fill="${c.deep}" opacity="0.45"/>`;
  svg += `</g>`;
  for (let y = 130; y < 520; y += 40) svg += seam(`M54 ${y}L206 ${y}`, c, 2);
  return svg;
};

const socks = (view, c) => {
  if (view === 'front') {
    const svg = `<g transform="translate(300 50) rotate(6 130 400)">${sock(c, 'sock-b')}</g>${sock(c, 'sock-a')}`;
    return { bbox: [20, 0, 860, 880], svg };
  }
  return {
    bbox: [20, 0, 560, 805],
    svg: `<g transform="rotate(-6 290 400)">${sock(c, 'sock-a')}</g>`,
  };
};

const tote = (view, c) => {
  const front = view === 'front';
  const handle = (offset, fill) =>
    `<path d="M${205 + offset} 262C${205 + offset} 30 ${435 - offset} 30 ${435 - offset} 262" fill="none" stroke="${c.line}" stroke-width="40" stroke-linecap="round"/>` +
    `<path d="M${205 + offset} 262C${205 + offset} 30 ${435 - offset} 30 ${435 - offset} 262" fill="none" stroke="${fill}" stroke-width="28" stroke-linecap="round"/>`;
  let svg = handle(18, c.soft) + handle(0, c.fill);
  svg += shape('M80 250L560 250L585 765L55 765Z', c);
  svg += stitch('M82 300L558 300', c) + stitch('M62 725L578 725', c);
  svg += front
    ? mark(320, 510, 2.4, c)
    : shape('M200 400L440 400L440 560L200 560Z', c, c.fill, 5) + stitch('M210 412L430 412', c);
  return { bbox: [55, 20, 585, 768], svg };
};

const GARMENTS = {
  tee,
  hoodie,
  longsleeve,
  jacket,
  short,
  relaxedshort: relaxedShort,
  jogger,
  cap,
  beanie,
  socks,
  tote,
};

export const GARMENT_KINDS = Object.keys(GARMENTS);

// view: 'front' | 'alt'. Returns { bbox: [x0, y0, x1, y1], svg } in local coordinates.
export function drawGarment(kind, view, fill) {
  const draw = GARMENTS[kind];
  if (draw === undefined) throw new Error(`Unknown garment: ${kind}`);
  return draw(view === 'front' ? 'front' : 'back', palette(fill));
}
