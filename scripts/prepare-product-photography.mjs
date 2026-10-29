// Reproducible, garment-only colour previews from licensed photographs, not generated models.
// Usage: node scripts/prepare-product-photography.mjs <Pexels download directory>
// Download IDs listed in docs/ASSETS.md as ID.jpg; tee uses 28079564.jpg.
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { COLORS, PRODUCT_IMAGES } from './placeholder-manifest.mjs';

const sourceDirectory = process.argv[2];
if (!sourceDirectory) throw new Error('Pass the directory containing the licensed originals');

// Hand-traced garment boundaries in the normalized 600 × 750 photograph. Skin, hair and
// surroundings stay photographic and unchanged. Source luminance retains fabric and folds.
const HOODIE =
  'M120 490 L128 446 L139 387 L149 324 L160 281 Q171 247 199 224 L220 211 L207 202 L204 181 L210 173 L248 179 L269 160 L280 158 L282 181 L319 205 L336 215 L356 210 L373 193 L365 177 L379 185 L389 207 L405 217 Q427 227 434 252 L451 292 L452 357 L457 411 L477 462 L486 503 L498 537 L492 573 L463 580 L445 551 L436 521 L436 584 L439 607 Q350 640 207 635 L201 605 L191 576 L183 606 L182 630 L139 639 L132 603 L121 568 Z';
const TEE =
  'M190 260 L199 231 L215 190 L228 171 L258 152 L269 141 Q290 157 310 146 L323 137 L349 148 L371 161 L387 188 L413 243 L363 259 L368 323 L363 347 L347 375 Q285 381 229 372 L222 365 L232 281 L234 269 L207 265 Z';
const SHORTS =
  'M222 370 Q281 382 347 376 L362 360 L378 383 L390 430 L397 470 L366 484 L314 491 L300 446 L293 490 Q243 501 200 476 L206 453 L211 419 Z';
const SOCK =
  'M316 277 Q357 287 403 256 L415 288 L422 320 L434 350 L448 375 L455 406 L460 433 Q482 444 502 446 L514 459 L513 475 Q483 495 450 495 L427 488 L412 472 L397 453 L375 438 L346 423 L316 408 Q299 394 307 374 L315 340 L322 320 L314 305 Z';

const SOURCES = {
  'essential-tee': { id: 28079564, mask: TEE, level: 215 },
  'premium-hoodie': { id: 6311503, mask: HOODIE, level: 220 },
  'essential-socks': { id: 6764342, mask: SOCK, level: 165 },
  'performance-socks': { id: 6764342, mask: SOCK, level: 165, detail: true },
  'performance-short': {
    id: 936075,
    mask: 'M200 495 L218 462 L243 483 L281 499 L319 502 L349 500 L360 524 L395 529 L413 516 L427 536 L431 561 L426 596 Q367 609 313 598 L300 577 Q260 548 219 561 L211 547 L222 533 L215 518 Z',
    level: 22,
  },
  'performance-long-sleeve': {
    id: 12400398,
    mask: 'M111 750 L116 653 L119 590 L116 536 L119 464 L136 445 L151 414 L165 373 L174 311 L170 282 Q201 263 219 260 Q248 259 264 282 L281 331 L304 375 L322 397 L337 423 L347 463 L362 510 L362 561 L370 623 L342 631 L301 638 L244 641 L242 687 L214 699 L175 717 L170 750 Z',
    level: 195,
  },
  'everyday-jogger': {
    id: 6311503,
    mask: 'M204 632 Q321 647 435 609 L445 628 L451 660 L441 696 L437 750 L195 750 L199 703 L198 672 Z',
    level: 210,
    detail: true,
  },
  'coach-jacket': {
    id: 6910349,
    mask: 'M191 741 L180 731 L166 677 L153 624 L147 563 L146 475 L144 386 L150 339 L167 294 L194 270 L237 253 L248 225 L283 232 L305 247 L329 239 L349 253 L377 279 L396 322 L417 380 L436 464 L452 540 L477 675 L445 685 L426 644 L403 548 L383 446 L369 375 L355 317 L352 290 L336 257 L315 260 L336 309 L354 392 L368 478 L380 560 L382 631 L373 678 Q317 696 246 683 L246 720 Z',
    level: 170,
  },
  'relaxed-short': { id: 28079564, mask: SHORTS, level: 165 },
  'classic-cap': {
    id: 7181333,
    mask: 'M178 480 Q168 451 188 428 Q208 402 241 422 L282 440 Q299 415 337 425 L370 431 Q431 450 448 493 Q459 525 455 561 L443 568 Q431 527 398 505 L352 490 L313 478 Q272 451 249 462 L232 476 L222 529 Q187 513 178 480 Z',
    level: 225,
    detail: true,
  },
  'knit-beanie': {
    id: 3760626,
    mask: 'M52 332 L59 267 L59 201 L67 149 L88 104 L86 74 L117 53 L143 40 L176 48 L207 44 L249 60 L279 78 L307 105 L333 140 L347 169 L357 201 L364 223 L357 244 L346 241 L342 219 Q325 197 291 198 Q241 207 206 224 L167 244 L133 270 L104 301 L79 316 L72 338 Z',
    level: 190,
  },
  'canvas-tote': {
    id: 1214212,
    mask: 'M93 368 L110 362 L157 358 L180 277 L194 213 L201 196 L207 221 L194 280 L177 357 L273 351 L252 215 L239 148 L235 141 L216 189 L213 171 L218 111 L249 100 L241 132 L266 170 L278 217 L294 283 L306 348 L340 348 L353 397 L364 481 L371 581 L373 642 L369 663 Q301 693 209 714 L123 732 L103 721 L95 682 L87 598 L89 485 L89 407 Z',
    level: 32,
  },
};

for (const product of PRODUCT_IMAGES) {
  const source = SOURCES[product.slug];
  if (!source) throw new Error(`Missing source for ${product.slug}`);
  const original = await sharp(path.join(sourceDirectory, `${source.id}.jpg`))
    .rotate()
    .resize(1200, 1500, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer();
  const mask = await sharp(
    Buffer.from(
      `<svg width="1200" height="1500" viewBox="0 0 600 750"><path d="${source.mask}" fill="white"/></svg>`,
    ),
  )
    .ensureAlpha()
    .blur(0.6)
    .raw()
    .toBuffer();
  const directory = path.join('public/images/products', product.slug);
  await mkdir(directory, { recursive: true });
  for (const color of product.colors) {
    const hex = COLORS[color];
    if (!hex) throw new Error(`Unknown colour ${color}`);
    const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
    const pixels = Buffer.from(original);
    for (let pixel = 0; pixel < 1200 * 1500; pixel++) {
      const offset = pixel * 3;
      const alpha = mask[pixel * 4 + 3] / 255;
      if (alpha === 0) continue;
      const luminance =
        original[offset] * 0.2126 + original[offset + 1] * 0.7152 + original[offset + 2] * 0.0722;
      const shade = Math.min(1.45, Math.max(0.12, luminance / source.level));
      for (let channel = 0; channel < 3; channel++) {
        const highlight = Math.max(0, luminance - source.level + 20);
        const texture = Math.min(0.8, (255 - rgb[channel]) / 240);
        const value = Math.min(255, Math.max(0, rgb[channel] * shade + highlight * texture));
        pixels[offset + channel] = Math.round(
          original[offset + channel] * (1 - alpha) + value * alpha,
        );
      }
    }
    const photograph = sharp(pixels, { raw: { width: 1200, height: 1500, channels: 3 } });
    // Back and side assets are prepared separately; never overwrite them with a front-view crop.
    const image = photograph;
    if (source.detail) {
      const top =
        product.slug === 'everyday-jogger' ? 860 : product.slug === 'classic-cap' ? 490 : 160;
      const height = 1500 - top;
      const width = Math.min(1200, Math.round(height * 0.8));
      image.extract({ left: Math.round((1200 - width) / 2), top, width, height });
    }
    const output = await image.resize(1200, 1500).webp({ quality: 80, effort: 5 }).toBuffer();
    const destination = path.join(directory, `${color}-1.webp`);
    const temporary = `${destination}.tmp`;
    await writeFile(temporary, output);
    await rename(temporary, destination);
  }
  process.stdout.write(`${product.slug}: photographic colour previews prepared\n`);
}
