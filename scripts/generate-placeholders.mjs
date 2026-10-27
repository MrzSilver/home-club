// Generates the rights-free placeholder rasters for the Home Club demo store (owner decision 2).
//
//   node scripts/generate-placeholders.mjs
//
// Everything is drawn as SVG in this repository and rasterised with sharp to WebP, so the output is
// original, deterministic and idempotent (a file is only rewritten when its bytes would change).
// Replace the output with rights-cleared photography before any public marketing use (RULES 14.3).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { drawGarment } from './placeholder-garments.mjs';
import {
  CATEGORY_IMAGE_SIZE,
  CATEGORY_TILES,
  COLORS,
  HERO_IMAGE_SIZE,
  HERO_SCENES,
  PRODUCT_IMAGES,
  PRODUCT_IMAGE_SIZE,
} from './placeholder-manifest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'images');

// Design tokens (DESIGN 2.1) used as backdrops. Raw hex is fine here: this is an asset script.
const SURFACE = '#EDE6DB';
const SAND = '#D6BF9C';
const FOREST = '#2B372D';
const INK = '#141412';

const PRODUCT_QUALITY = 80;
const SCENE_QUALITY = 74;

const svgDoc = (width, height, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
  `<defs>` +
  `<linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">` +
  `<stop offset="0" stop-color="#fff" stop-opacity="0.18"/>` +
  `<stop offset="0.55" stop-color="#fff" stop-opacity="0"/>` +
  `<stop offset="1" stop-color="#000" stop-opacity="0.16"/></linearGradient>` +
  `<filter id="blur-s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter>` +
  `<filter id="blur-m" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="22"/></filter>` +
  `<filter id="blur-l" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="48"/></filter>` +
  `${defs}</defs>${body}</svg>`;

// ---------------------------------------------------------------------------------------------
// Product shots: 1200x1500, garment on the surface tone.
// ---------------------------------------------------------------------------------------------

// Target box (w, h) and vertical centre per garment so every shot has a consistent margin.
const FIT = {
  default: { w: 820, h: 960, cy: 720 },
  cap: { w: 840, h: 640, cy: 700 },
  beanie: { w: 720, h: 720, cy: 700 },
  short: { w: 860, h: 700, cy: 700 },
  relaxedshort: { w: 860, h: 800, cy: 710 },
  jogger: { w: 640, h: 1040, cy: 740 },
  socks: { w: 780, h: 920, cy: 720 },
  tote: { w: 720, h: 900, cy: 720 },
};

function productSvg(garment, colorHex, view) {
  const { width, height } = PRODUCT_IMAGE_SIZE;
  const { bbox, svg } = drawGarment(garment, view, colorHex);
  const [x0, y0, x1, y1] = bbox;
  const fit = FIT[garment] ?? FIT.default;
  const bw = x1 - x0;
  const bh = y1 - y0;
  const scale = Math.min(fit.w / bw, fit.h / bh);
  const tx = width / 2 - (x0 + bw / 2) * scale;
  const ty = fit.cy - (y0 + bh / 2) * scale;
  const floorY = fit.cy + (bh * scale) / 2 + 26;
  const alt = view !== 'front';
  const base = alt ? '#E6DED0' : SURFACE;
  const glow = alt ? '#F1EBE0' : '#F3EEE5';
  const light = alt ? 'x1="0" y1="0" x2="1" y2="1"' : 'cx="50%" cy="38%" r="75%"';
  const bgDef = alt
    ? `<linearGradient id="bg" ${light}><stop offset="0" stop-color="${glow}"/><stop offset="1" stop-color="${base}"/></linearGradient>`
    : `<radialGradient id="bg" ${light}><stop offset="0" stop-color="${glow}"/><stop offset="1" stop-color="${base}"/></radialGradient>`;
  const body =
    `<rect width="${width}" height="${height}" fill="url(#bg)"/>` +
    (alt
      ? `<polygon points="760,0 1200,0 1200,520" fill="#fff" opacity="0.28" filter="url(#blur-l)"/>`
      : '') +
    `<ellipse cx="${width / 2}" cy="${floorY}" rx="${(bw * scale) / 2.3}" ry="${alt ? 30 : 26}" fill="${INK}" opacity="0.2" filter="url(#blur-m)"/>` +
    `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(5)})">${svg}</g>`;
  return svgDoc(width, height, body, bgDef);
}

// ---------------------------------------------------------------------------------------------
// Hero scenes: 1920x1080, abstract architecture with figures-as-shapes. The bottom-left stays dark.
// ---------------------------------------------------------------------------------------------

const figure = (x, groundY, height, fill, pose = 'stand') => {
  const u = height / 10;
  const head = `<circle cx="${x}" cy="${groundY - 9.2 * u}" r="${0.62 * u}" fill="${fill}"/>`;
  const torso = `<path d="M${x - 1.25 * u} ${groundY - 8.3 * u}Q${x} ${groundY - 8.7 * u} ${x + 1.25 * u} ${groundY - 8.3 * u}L${x + 1.05 * u} ${groundY - 4.7 * u}L${x - 1.05 * u} ${groundY - 4.7 * u}Z" fill="${fill}"/>`;
  const arms =
    `<path d="M${x - 1.25 * u} ${groundY - 8.2 * u}L${x - 1.7 * u} ${groundY - 5 * u}L${x - 1.35 * u} ${groundY - 4.9 * u}L${x - 0.95 * u} ${groundY - 7.6 * u}Z" fill="${fill}"/>` +
    `<path d="M${x + 1.25 * u} ${groundY - 8.2 * u}L${x + 1.7 * u} ${groundY - 5 * u}L${x + 1.35 * u} ${groundY - 4.9 * u}L${x + 0.95 * u} ${groundY - 7.6 * u}Z" fill="${fill}"/>`;
  const legs =
    pose === 'walk'
      ? `<path d="M${x - 1 * u} ${groundY - 4.8 * u}L${x + 0.1 * u} ${groundY - 4.8 * u}L${x - 0.7 * u} ${groundY}L${x - 1.6 * u} ${groundY}Z" fill="${fill}"/>` +
        `<path d="M${x - 0.1 * u} ${groundY - 4.8 * u}L${x + 1 * u} ${groundY - 4.8 * u}L${x + 1.9 * u} ${groundY - 0.2 * u}L${x + 1.1 * u} ${groundY}Z" fill="${fill}"/>`
      : `<path d="M${x - 1 * u} ${groundY - 4.8 * u}L${x - 0.05 * u} ${groundY - 4.8 * u}L${x - 0.15 * u} ${groundY}L${x - 0.95 * u} ${groundY}Z" fill="${fill}"/>` +
        `<path d="M${x + 0.05 * u} ${groundY - 4.8 * u}L${x + 1 * u} ${groundY - 4.8 * u}L${x + 0.95 * u} ${groundY}L${x + 0.15 * u} ${groundY}Z" fill="${fill}"/>`;
  return head + torso + arms + legs;
};

// Seated, facing left: hips at (x, seatY), knee beyond the step edge, feet on the step below.
const seatedFigure = (x, seatY, u, fill) =>
  `<circle cx="${x + 0.1 * u}" cy="${seatY - 3.95 * u}" r="${0.6 * u}" fill="${fill}"/>` +
  `<path d="M${x - 0.9 * u} ${seatY}L${x - 0.8 * u} ${seatY - 3.2 * u}L${x + 0.9 * u} ${seatY - 3.3 * u}L${x + 1 * u} ${seatY}Z" fill="${fill}"/>` +
  `<path d="M${x - 0.9 * u} ${seatY - 1 * u}L${x - 4.6 * u} ${seatY - 1 * u}L${x - 4.6 * u} ${seatY}L${x - 0.9 * u} ${seatY}Z" fill="${fill}"/>` +
  `<path d="M${x - 4.6 * u} ${seatY - 1 * u}L${x - 3.8 * u} ${seatY - 1 * u}L${x - 3.85 * u} ${seatY + 2 * u}L${x - 4.55 * u} ${seatY + 2 * u}Z" fill="${fill}"/>` +
  `<path d="M${x + 0.4 * u} ${seatY - 3 * u}L${x - 3.7 * u} ${seatY - 1.2 * u}" stroke="${fill}" stroke-width="${0.55 * u}" stroke-linecap="round" fill="none"/>`;

// Dark bottom-left area for the headline: radial vignette anchored in the corner.
const headlineShade = (width, height, strength) =>
  `<radialGradient id="shade" cx="0" cy="${height}" r="${Math.round(width * 0.62)}" gradientUnits="userSpaceOnUse">` +
  `<stop offset="0" stop-color="#0d0f0d" stop-opacity="${strength}"/>` +
  `<stop offset="0.55" stop-color="#0d0f0d" stop-opacity="${(strength * 0.55).toFixed(2)}"/>` +
  `<stop offset="1" stop-color="#0d0f0d" stop-opacity="0"/></radialGradient>`;

function heroSand() {
  const { width: w, height: h } = HERO_IMAGE_SIZE;
  const defs =
    `<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EBDABD"/><stop offset="1" stop-color="#CDB48A"/></linearGradient>` +
    `<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B99C70"/><stop offset="1" stop-color="#7C6444"/></linearGradient>` +
    `<linearGradient id="arch" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6F5A3F"/><stop offset="1" stop-color="#3C3123"/></linearGradient>` +
    headlineShade(w, h, 0.88);
  const body =
    `<rect width="${w}" height="${h}" fill="url(#wall)"/>` +
    `<polygon points="520,0 980,0 1420,760 760,760" fill="#fff" opacity="0.2" filter="url(#blur-l)"/>` +
    `<rect x="160" y="300" width="560" height="470" fill="#D9C4A0"/>` +
    `<path d="M300 770V430a140 140 0 0 1 280 0V770Z" fill="url(#arch)"/>` +
    `<rect x="1180" y="130" width="440" height="640" fill="#DEC9A5"/>` +
    `<polygon points="1620,130 1720,170 1720,770 1620,770" fill="#A98B62"/>` +
    `<polygon points="1180,130 1620,130 1720,170 1280,170" fill="#EBDDBF"/>` +
    `<rect x="0" y="770" width="${w}" height="${h - 770}" fill="url(#floor)"/>` +
    `<polygon points="1180,770 1720,770 1050,${h} 380,${h}" fill="${INK}" opacity="0.26" filter="url(#blur-s)"/>` +
    `<polygon points="160,770 720,770 560,${h} 80,${h}" fill="${INK}" opacity="0.2" filter="url(#blur-s)"/>` +
    `<polygon points="990,850 1060,850 520,${h} 380,${h}" fill="${INK}" opacity="0.22" filter="url(#blur-s)"/>` +
    figure(1010, 850, 470, FOREST) +
    `<rect width="${w}" height="${h}" fill="url(#shade)"/>`;
  return svgDoc(w, h, body, defs);
}

function heroForest() {
  const { width: w, height: h } = HERO_IMAGE_SIZE;
  const defs =
    `<linearGradient id="bgf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#52634F"/><stop offset="0.6" stop-color="#2D3B2E"/><stop offset="1" stop-color="#151C16"/></linearGradient>` +
    `<linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EBD9B0" stop-opacity="0.34"/><stop offset="1" stop-color="#EBD9B0" stop-opacity="0.02"/></linearGradient>` +
    headlineShade(w, h, 0.85);
  const trunk = (x, width, fill, opacity, blur) =>
    `<rect x="${x}" y="-40" width="${width}" height="${h + 80}" rx="${width / 3}" fill="${fill}" opacity="${opacity}"${blur ? ' filter="url(#blur-s)"' : ''}/>`;
  const back = [120, 420, 640, 880, 1180, 1500, 1760]
    .map((x, i) => trunk(x, 46 + (i % 3) * 18, '#1F2B21', 0.6, true))
    .join('');
  const mid = [260, 760, 1040, 1390, 1650]
    .map((x, i) => trunk(x, 70 + (i % 2) * 28, '#18211A', 0.85, false))
    .join('');
  const front = [-20, 540, 1840]
    .map((x, i) => trunk(x, 130 + i * 20, '#0F150F', 0.95, false))
    .join('');
  const body =
    `<rect width="${w}" height="${h}" fill="url(#bgf)"/>` +
    back +
    `<polygon points="1180,-40 1420,-40 1500,${h} 1000,${h}" fill="url(#shaft)" filter="url(#blur-m)"/>` +
    `<ellipse cx="1000" cy="640" rx="900" ry="90" fill="#D9E0D0" opacity="0.1" filter="url(#blur-l)"/>` +
    mid +
    `<ellipse cx="1280" cy="900" rx="320" ry="26" fill="#000" opacity="0.4" filter="url(#blur-s)"/>` +
    figure(1280, 890, 440, SAND, 'walk') +
    front +
    `<rect width="${w}" height="${h}" fill="url(#shade)"/>`;
  return svgDoc(w, h, body, defs);
}

function heroSteps() {
  const { width: w, height: h } = HERO_IMAGE_SIZE;
  const defs =
    `<linearGradient id="wallc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E4DED3"/><stop offset="1" stop-color="#BDB4A5"/></linearGradient>` +
    headlineShade(w, h, 0.9);
  let steps = '';
  for (let i = 0; i < 6; i += 1) {
    const x = 640 + i * 230;
    const top = 840 - i * 96;
    steps +=
      `<rect x="${x}" y="${top}" width="${w - x}" height="${h - top}" fill="${i % 2 === 0 ? '#C9C0B1' : '#BFB5A5'}"/>` +
      `<rect x="${x}" y="${top}" width="${w - x}" height="14" fill="#E9E3D8"/>` +
      `<rect x="${x}" y="${top + 14}" width="14" height="${h - top}" fill="#9F9685" opacity="0.5"/>`;
  }
  const body =
    `<rect width="${w}" height="${h}" fill="url(#wallc)"/>` +
    `<polygon points="1100,0 1500,0 1920,640 1440,640" fill="#fff" opacity="0.3" filter="url(#blur-l)"/>` +
    steps +
    `<polygon points="1000,${h} 1500,560 1700,560 1300,${h}" fill="${INK}" opacity="0.2" filter="url(#blur-s)"/>` +
    seatedFigure(1492, 552, 48, FOREST) +
    `<rect width="${w}" height="${h}" fill="url(#shade)"/>`;
  return svgDoc(w, h, body, defs);
}

// ---------------------------------------------------------------------------------------------
// Category tiles: 1200x800, garments on tonal backdrops, darker toward the bottom-left for the title.
// ---------------------------------------------------------------------------------------------

function placeGarment(kind, hex, view, cx, cy, maxW, maxH, rotate = 0) {
  const { bbox, svg } = drawGarment(kind, view, hex);
  const [x0, y0, x1, y1] = bbox;
  const bw = x1 - x0;
  const bh = y1 - y0;
  const scale = Math.min(maxW / bw, maxH / bh);
  const tx = cx - (x0 + bw / 2) * scale;
  const ty = cy - (y0 + bh / 2) * scale;
  const shadow = `<ellipse cx="${cx}" cy="${cy + (bh * scale) / 2 + 16}" rx="${(bw * scale) / 2.4}" ry="16" fill="#000" opacity="0.28" filter="url(#blur-s)"/>`;
  return `${shadow}<g transform="rotate(${rotate} ${cx} ${cy}) translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(5)})">${svg}</g>`;
}

function categoryTile(name) {
  const { width: w, height: h } = CATEGORY_IMAGE_SIZE;
  const shade = headlineShade(w, h, 0.78);
  const wrap = (bgDefs, content) =>
    svgDoc(w, h, `${content}<rect width="${w}" height="${h}" fill="url(#shade)"/>`, bgDefs + shade);
  if (name === 'foundations') {
    return wrap(
      `<linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#DCC7A3"/><stop offset="1" stop-color="#A88A5E"/></linearGradient>`,
      `<rect width="${w}" height="${h}" fill="url(#t)"/>` +
        `<rect x="640" y="0" width="560" height="${h}" fill="#fff" opacity="0.1"/>` +
        placeGarment('tee', COLORS.white, 'front', 760, 360, 520, 520) +
        placeGarment('tee', COLORS.black, 'front', 1010, 470, 300, 300, 6),
    );
  }
  if (name === 'performance') {
    return wrap(
      `<linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3E5140"/><stop offset="1" stop-color="#1A221B"/></linearGradient>`,
      `<rect width="${w}" height="${h}" fill="url(#t)"/>` +
        `<polygon points="720,0 940,0 620,${h} 400,${h}" fill="#EBD9B0" opacity="0.12" filter="url(#blur-m)"/>` +
        placeGarment('longsleeve', COLORS.grey, 'front', 760, 340, 460, 500) +
        placeGarment('short', COLORS.black, 'front', 1000, 540, 340, 300),
    );
  }
  if (name === 'lifestyle') {
    return wrap(
      `<linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C4B8A3"/><stop offset="1" stop-color="#8D8068"/></linearGradient>`,
      `<rect width="${w}" height="${h}" fill="url(#t)"/>` +
        `<circle cx="900" cy="330" r="260" fill="#F1E7D2" opacity="0.18" filter="url(#blur-m)"/>` +
        placeGarment('hoodie', COLORS.grey, 'front', 740, 360, 460, 520) +
        placeGarment('jogger', COLORS.sand, 'front', 1020, 430, 220, 560, -4),
    );
  }
  return wrap(
    `<linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3A362E"/><stop offset="1" stop-color="#17150F"/></linearGradient>` +
      `<radialGradient id="spot" cx="0.6" cy="0.4" r="0.5"><stop offset="0" stop-color="#E7D6B2" stop-opacity="0.32"/><stop offset="1" stop-color="#E7D6B2" stop-opacity="0"/></radialGradient>`,
    `<rect width="${w}" height="${h}" fill="url(#t)"/><rect width="${w}" height="${h}" fill="url(#spot)"/>` +
      placeGarment('cap', COLORS.white, 'front', 640, 340, 440, 300) +
      placeGarment('tote', COLORS.sand, 'front', 1040, 440, 300, 440, 3),
  );
}

// ---------------------------------------------------------------------------------------------
// IO
// ---------------------------------------------------------------------------------------------

async function render(svg, quality) {
  return sharp(Buffer.from(svg)).webp({ quality, effort: 6 }).toBuffer();
}

const stats = { written: 0, unchanged: 0, bytes: 0 };

async function emit(relativePath, buffer) {
  const target = path.join(OUT, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  let current = null;
  try {
    current = await readFile(target);
  } catch {
    current = null;
  }
  if (current !== null && current.equals(buffer)) {
    stats.unchanged += 1;
  } else {
    await writeFile(target, buffer);
    stats.written += 1;
  }
  stats.bytes += buffer.length;
}

async function main() {
  for (const product of PRODUCT_IMAGES) {
    for (const colorId of product.colors) {
      const hex = COLORS[colorId];
      if (hex === undefined) throw new Error(`Unknown colour "${colorId}" for ${product.slug}`);
      for (const [index, view] of ['front', 'alt'].entries()) {
        const buffer = await render(productSvg(product.garment, hex, view), PRODUCT_QUALITY);
        await emit(`products/${product.slug}/${colorId}-${index + 1}.webp`, buffer);
      }
    }
  }

  const heroes = { 'hero-1': heroSand, 'hero-2': heroForest, 'hero-3': heroSteps };
  for (const name of HERO_SCENES) {
    const scene = heroes[name];
    if (scene === undefined) throw new Error(`No hero scene for ${name}`);
    await emit(`brand/${name}.webp`, await render(scene(), SCENE_QUALITY));
  }

  for (const name of CATEGORY_TILES) {
    await emit(`categories/${name}.webp`, await render(categoryTile(name), SCENE_QUALITY));
  }

  process.stdout.write(
    `placeholders: ${stats.written} written, ${stats.unchanged} unchanged, ${(stats.bytes / 1024).toFixed(0)} kB total\n`,
  );
}

await main();
